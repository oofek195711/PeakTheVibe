/* PeakTheVibe: game rules. Scoring, stats, titles, round status, topic queue, language rules. Pure logic, no DOM, no Firebase writes. */

/* ---------- scoring ---------- */
/* Rating scale of a round: rounds created from v1.0.11 use 1-10, older rounds stay 1-5. */
const scaleOf = r => (r && r.scale === 10) ? 10 : 5;
function roundData(r) {
  const sc = scaleOf(r);
  const picks = S.picks.filter(p => p.rid === r.id);
  const by = {}, gs = {};
  const bt = {};
  S.ratings.filter(x => x.rid === r.id).forEach(x => { by[x.uid] = x.scores || {}; gs[x.uid] = x.guesses || {}; if (x.bet) bt[x.uid] = x.bet });
  const pickers = new Set(picks.map(p => p.uid));
  const keyMap = {};
  picks.forEach(p => songKeys(p).forEach(k => (keyMap[k] = keyMap[k] || new Set()).add(p.uid)));
  const rows = picks.map(p => {
    const got = [];
    for (const [ru, sc] of Object.entries(by)) { if (ru === p.uid) continue; const v = sc[p.uid]; if (v && v.fit && v.fun) got.push(v) }
    const mine = by[p.uid] || {};
    const complete = picks.filter(q => q.uid !== p.uid).every(q => mine[q.uid] && mine[q.uid].fit && mine[q.uid].fun);
    const n = got.length;
    const fit = n ? got.reduce((a, v) => a + v.fit, 0) / n : 0, fun = n ? got.reduce((a, v) => a + v.fun, 0) / n : 0;
    // song points are always out of 10: (fit + fun) on a 1-5 round, their average on a 1-10 round
    const raw = r1((fit + fun) * 5 / sc);
    // averages converted to a 1-10 scale, so stats can mix old and new rounds fairly
    const fit10 = fit * 10 / sc, fun10 = fun * 10 / sc;
    const hive = songKeys(p).some(k => keyMap[k].size > 1);
    let gRight = 0, gTot = 0;
    for (const [gu, g] of Object.entries(gs)) { if (gu === p.uid) continue; const v = g[p.uid]; if (v) { gTot++; if (v === p.uid) gRight++ } }
    return { ...p, n, fit, fun, fit10, fun10, raw, complete, pts: complete ? raw : 0, hive, gRight, gTot };
  });
  rows.sort((a, b) => b.pts - a.pts || b.raw - a.raw);
  const bonus = {}, made = {};
  for (const [gu, g] of Object.entries(gs)) {
    let c = 0, m = 0;
    for (const [pu, v] of Object.entries(g)) { if (pu === gu || !pickers.has(pu) || !v) continue; m++; if (v === pu) c++ }
    if (c) bonus[gu] = c; if (m) made[gu] = m;
  }
  // bet on the winner: +1 to whoever bet on a song that finished first (not their own)
  const topPts = rows.length && rows[0].pts > 0 ? rows[0].pts : null;
  const winners = new Set(rows.filter(x => topPts !== null && x.pts === topPts).map(x => x.uid));
  const betBonus = {}, betMade = {}, betOn = {};
  for (const [bu, target] of Object.entries(bt)) {
    if (target === bu || !pickers.has(target)) continue;
    betMade[bu] = 1; betOn[target] = (betOn[target] || 0) + 1;
    if (winners.has(target)) betBonus[bu] = 1;
  }
  rows.forEach(x => { x.bets = betOn[x.uid] || 0 });
  return { rows, bonus, made, betBonus, betMade, funny: funnyOf(r), scale: sc };
}
const doneRounds = () => S.rounds.filter(r => phase(r) === 'done');
function aggregate(rounds) {
  const P = {};
  const g = u => P[u] || (P[u] = { uid: u, pts: 0, bonus: 0, wins: 0, played: 0, fitSum: 0, fitN: 0, funSum: 0, funN: 0, gMade: 0, gOnRight: 0, gOnTot: 0, hive: 0, bet: 0, betMade: 0 });
  let flop = null;
  rounds.forEach(r => {
    const d = roundData(r);
    const top = d.rows.length && d.rows[0].pts > 0 ? d.rows[0].pts : null;
    d.rows.forEach(x => {
      const t = g(x.uid); t.pts += x.pts; t.played++;
      if (top !== null && x.pts === top) t.wins++;
      if (x.n) { t.fitSum += x.fit10; t.fitN++; if (d.funny) { t.funSum += x.fun10; t.funN++ } }
      t.gOnRight += x.gRight; t.gOnTot += x.gTot; if (x.hive) t.hive++;
      if (x.complete && x.n && (!flop || x.pts < flop.pts)) flop = { ...x, topic: r.topic };
    });
    Object.entries(d.bonus).forEach(([u, c]) => g(u).bonus += c);
    Object.entries(d.made).forEach(([u, c]) => g(u).gMade += c);
    Object.keys(d.betBonus).forEach(u => g(u).bet++);
    Object.keys(d.betMade).forEach(u => g(u).betMade++);
  });
  Object.values(P).forEach(t => { t.total = r1(t.pts + t.bonus + t.bet); t.pts = r1(t.pts) });
  return { P, flop, count: rounds.length };
}
function maxBy(arr, f, cond) {
  let best = null, uids = [];
  arr.forEach(t => { if (!cond(t)) return; const v = f(t); if (best === null || v > best + 1e-9) { best = v; uids = [t.uid] } else if (Math.abs(v - best) < 1e-9) uids.push(t.uid) });
  return uids;
}
function titles() {
  const done = doneRounds(), ws = weekStart();
  const A = Object.values(aggregate(done).P), wk = aggregate(done.filter(r => r.rateEnds >= ws)), W = Object.values(wk.P);
  return [
    { ic: '👑', n: 'Weekly Champion', d: 'מקום ראשון השבוע', u: maxBy(W, t => t.total, t => t.total > 0) },
    { ic: '💀', n: 'Flop of the Week', d: wk.flop ? 'הכי מעט נקודות השבוע: ' + wk.flop.title : 'השיר עם הכי מעט נקודות השבוע', u: wk.flop ? [wk.flop.uid] : [] },
    { ic: '🐑', n: 'Hive Mind', d: 'בחרו אותו שיר כמו מישהו אחר השבוע', u: W.filter(t => t.hive > 0).map(t => t.uid) },
    { ic: '🎯', n: 'Sniper', d: 'ממוצע ההתאמה הכי גבוה', u: maxBy(A, t => t.fitSum / t.fitN, t => t.fitN > 0) },
    { ic: '🤡', n: 'Comedian', d: 'הכי הרבה נקודות מצחיק', u: maxBy(A, t => t.funSum, t => t.funSum > 0) },
    { ic: '🕵️', n: 'Unpredictable', d: 'הכי קשה לנחש את הבחירות שלו', u: maxBy(A, t => 1 - t.gOnRight / t.gOnTot, t => t.gOnTot >= 3) },
    { ic: '🔮', n: 'Mind Reader', d: 'הכי הרבה ניחושים נכונים', u: maxBy(A, t => t.bonus, t => t.bonus > 0) }
  ];
}
function streak(uid) {
  const rs = S.rounds.slice().sort((a, b) => b.createdAt - a.createdAt);
  let s = 0;
  for (const r of rs) {
    if (S.picks.some(p => p.rid === r.id && p.uid === uid)) { s++; continue }
    if (s === 0 && phase(r) === 'pick') continue;
    break;
  }
  return s;
}

const inactiveSet = () => new Set(S.settings.inactive || []);
const activeIds = () => { const x = inactiveSet(); return Object.keys(S.players).filter(u => !x.has(u)) };
function roundStatus(r) {
  const ph = phase(r), act = activeIds();
  const picks = S.picks.filter(p => p.rid === r.id), rats = S.ratings.filter(x => x.rid === r.id);
  const seen = u => !!(S.players[u] && S.players[u].seen && S.players[u].seen[r.id]);
  if (ph === 'pick') {
    const st = u => { const p = picks.find(x => x.uid === u); if (p) return p.locked ? 'locked' : 'draft'; return seen(u) ? 'seen' : 'none' };
    const ids = [...new Set([...act, ...picks.map(p => p.uid)])];
    const groups = [['locked', '🔒', 'נעלו'], ['draft', '✏️', 'בטיוטה'], ['seen', '👀', 'נכנסו ועוד לא בחרו'], ['none', '💤', 'עוד לא נכנסו']].map(([k, ic, l]) => ({ ic, l, u: ids.filter(u => st(u) === k) }));
    const n = act.filter(u => st(u) === 'locked').length;
    return { groups, all: act.length > 0 && n === act.length, short: `🔒 ${n}/${act.length}`, ph };
  }
  const pickers = picks.map(p => p.uid);
  const ids = [...new Set([...act, ...pickers, ...rats.map(x => x.uid)])];
  const st = u => { const x = rats.find(y => y.uid === u); return x ? (x.locked ? 'locked' : 'draft') : 'none' };
  const groups = [['locked', '🔒', 'נעלו דירוג'], ['draft', '✏️', 'דירגו בטיוטה'], ['none', '💤', 'עוד לא דירגו']].map(([k, ic, l]) => ({ ic, l, u: ids.filter(u => st(u) === k) }));
  const n = pickers.filter(u => st(u) === 'locked').length;
  return { groups, all: pickers.length > 0 && n === pickers.length, short: `🔒 ${n}/${pickers.length}`, ph, pickers: new Set(pickers) };
}
function fallbackTopic(seed) {
  const used = new Set(S.rounds.map(r => r.topic));
  const pool = SUGGEST.filter(s => !used.has(s.t)), list = pool.length ? pool : SUGGEST;
  const s = list[hash(seed) % list.length];
  return { topic: s.t, metric2: s.m, funny: s.f };
}

function buildLog(r) {
  const d = roundData(r);
  return {
    rid: r.id, topic: r.topic, metric2: m2of(r), funny: funnyOf(r), scale: scaleOf(r), img: r.img || '', createdAt: r.createdAt, pickEnds: r.pickEnds, rateEnds: r.rateEnds, loggedAt: now(),
    results: d.rows.map((x, i) => ({ rank: i + 1, uid: x.uid, nick: nameOf(x.uid), title: x.title, artist: x.artist || '', url: x.url || '', artwork: x.artwork || '', source: x.source || 'manual', locked: !!x.locked,
      fit: r1(x.fit), fun: r1(x.fun), raters: x.n, pts: x.pts, complete: x.complete, guessedRight: x.gRight, guessedTotal: x.gTot, hive: x.hive })),
    bonus: Object.entries(d.bonus).map(([u, c]) => ({ uid: u, nick: nameOf(u), bonus: c })),
    betWinners: Object.keys(d.betBonus).map(u => ({ uid: u, nick: nameOf(u) })),
    ratings: S.ratings.filter(x => x.rid === r.id).map(x => ({ rater: nameOf(x.uid), raterUid: x.uid, locked: !!x.locked,
      scores: Object.entries(x.scores || {}).map(([u, v]) => ({ song: nameOf(u), fit: v.fit || 0, fun: v.fun || 0 })),
      guesses: Object.entries(x.guesses || {}).map(([u, g]) => ({ song: nameOf(u), guess: nameOf(g), right: u === g })) }))
  };
}
const queue = () => S.topics.filter(t => t.status === 'approved').sort((a, b) => (a.order || 0) - (b.order || 0));
const pendingTopics = () => S.topics.filter(t => t.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
function startOf(d) { const x = new Date(d); x.setHours(S.settings.startHour, 0, 0, 0); return x.getTime() }
function nextAutoTime() {
  const t = new Date(), id = dayId(t);
  if (S.rounds.some(r => r.id === id) || now() >= startOf(t)) { const n = new Date(t); n.setDate(n.getDate() + 1); return startOf(n) }
  return startOf(t);
}
const hasHeb = s => /[\u0590-\u05FF]/.test(s || '');
const hasLat = s => /[A-Za-z]/.test(s || '');
function langWarning(r, title, artist) {
  const k = langOf(r), txt = title + ' ' + (artist || '');
  if (k === 'en' && hasHeb(txt)) return 'בסבב הזה השיר צריך להיות באנגלית, אבל שם השיר או האמן כתוב בעברית.';
  if (k === 'he' && !hasHeb(title) && hasLat(title)) return 'בסבב הזה השיר צריך להיות בעברית, אבל שם השיר כתוב באותיות באנגלית.';
  return '';
}

/* Anonymous per-round token for a song, so the rating screen never carries the submitter's id. */
const songTok = (rid, uid) => 's' + hash(rid + '|' + uid).toString(36);
const uidFromTok = (rid, tok) => { const p = S.picks.find(x => x.rid === rid && songTok(rid, x.uid) === tok); return p ? p.uid : null };

/* Reminder message the admin can send to the group: who hasn't locked yet, and how long is left. */
const GAME_URL = 'https://oofek195711.github.io/PeakTheVibe/';
function reminderText(r) {
  const t = roundStatus(r), ph = phase(r);
  const left = fmtLeft((ph === 'pick' ? r.pickEnds : r.rateEnds) - now());
  // a saved song counts as done; in rating, a saved rating of every song counts as done
  const picks = S.picks.filter(p => p.rid === r.id);
  const ratedAll = u => { const x = S.ratings.find(y => y.rid === r.id && y.uid === u), sc = (x && x.scores) || {};
    return !!x && picks.filter(p => p.uid !== u).every(p => sc[p.uid] && sc[p.uid].fit && sc[p.uid].fun) };
  const miss = ph === 'pick'
    ? t.groups.filter(g => g.ic === '👀' || g.ic === '💤').flatMap(g => g.u)
    : [...t.pickers].filter(u => !ratedAll(u));
  const lines = ['🎧 *PeakTheVibe*', '', '*' + r.topic + '*', ...(r.img ? ['🖼️ הנושא הפעם הוא תמונה, נכנסים לראות'] : []),
    ph === 'pick' ? `⏰ נשארו ${left} לבחור שיר!` : `⭐ נשארו ${left} לדרג את השירים!`];
  if (miss.length) lines.push('', (ph === 'pick' ? 'עוד לא בחרו שיר: ' : 'עוד לא דירגו את כל השירים: ') + miss.map(nameOf).join(', '));
  if (ph === 'rate') lines.push('', 'זוכרים: מי שבחר שיר ולא דירג את כולם מקבל 0 🙃');
  lines.push('', '👇 ' + GAME_URL);
  return lines.join('\n');
}

/* ---------- weekly summary ----------
   A week runs Sunday 00:00 to the next Sunday 00:00; a round belongs to the week its results were revealed in. */
function prevWeekRange() {
  const to = weekStart(), d = new Date(to); d.setDate(d.getDate() - 7);
  return { from: d.getTime(), to };
}
function weekSummary(from, to) {
  const rs = doneRounds().filter(r => r.rateEnds >= from && r.rateEnds < to);
  if (!rs.length) return null;
  const ag = aggregate(rs);
  const rows = Object.values(ag.P).filter(t => t.played || t.total > 0).sort((a, b) => b.total - a.total || b.wins - a.wins);
  if (!rows.length) return null;
  let best = null, songs = 0;
  rs.forEach(r => roundData(r).rows.forEach(x => { songs++; if (x.complete && x.n && (!best || x.pts > best.pts)) best = { ...x, topic: r.topic } }));
  const top = (f) => { const m = Math.max(0, ...rows.map(f)); return m > 0 ? { n: m, u: rows.filter(t => f(t) === m).map(t => t.uid) } : null };
  return { from, to, rounds: rs.length, songs, rows, best, flop: ag.flop && best && ag.flop.pts < best.pts ? ag.flop : null, guesser: top(t => t.bonus), bettor: top(t => t.bet) };
}
const dm = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
const weekLabel = s => dm(s.from) + ' עד ' + dm(s.to - 864e5 / 2);
function weeklyText(s) {
  const medals = ['🥇', '🥈', '🥉'];
  const L = ['🎧 *PeakTheVibe: סיכום השבוע*', weekLabel(s) + ', ' + s.rounds + ' סבבים, ' + s.songs + ' שירים', ''];
  s.rows.slice(0, 3).forEach((t, i) => L.push(`${medals[i]} ${nameOf(t.uid)}: ${t.total} נק׳`));
  if (s.best) L.push('', `🎵 השיר של השבוע: ${s.best.title}${s.best.artist ? ' / ' + s.best.artist : ''} (${nameOf(s.best.uid)}, ${s.best.pts} נק׳)`);
  if (s.flop) L.push(`💀 Flop: ${s.flop.title} (${nameOf(s.flop.uid)}, ${s.flop.pts} נק׳)`);
  if (s.guesser) L.push(`🔮 הכי הרבה ניחושים נכונים: ${s.guesser.u.map(nameOf).join(', ')} (${s.guesser.n})`);
  L.push('', '👇 ' + GAME_URL);
  return L.join('\n');
}
