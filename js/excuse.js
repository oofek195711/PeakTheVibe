/* PeakTheVibe: the situations game (🎭 סיטואציות).
   Same engine as the song game (rounds, locking, tracking, guesses, bets, reveal),
   with its own screens. Each player gets a personal timer to write, starting the moment
   they tap "start"; the situation stays hidden until then. Loaded after ui.js. */

const xQuote = t => `<div class="xquote">${esc(t)}</div>`;
const xClip = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t };
function xSituation(r) {
  return `<div class="xsit"><small>🎭 הסיטואציה</small><div class="display">${esc(r.topic)}</div>${topicImgHtml(r)}<div class="xask">מה אתה אומר?</div></div>`;
}
function xSlider(tok, val, locked) {
  const pct = val ? (val - 1) / 9 : 0.5;
  return `<div class="slider fun ${val ? 'set' : ''} ${locked ? 'dis' : ''}" role="slider" tabindex="${locked ? -1 : 0}" aria-valuemin="1" aria-valuemax="10" aria-valuenow="${val || ''}" data-slide="${tok}" data-k="fun" style="--p:${pct}"><div class="trk"><div class="fill"></div><div class="thumb"></div></div><span class="sval">${val || 'גררו'}</span></div><div class="sticks"><span>1</span><span>10</span></div>`;
}
function xCard(p, o) {
  o = o || {};
  return `<div class="scard xcard ${o.self ? 'self' : ''}">${o.tag ? `<div class="stag">${o.tag}</div>` : ''}${xQuote(p.text)}${o.body || ''}</div>`;
}
function xAdminTools(r, ph, entries) {
  if (!isAdmin()) return '';
  const st = roundStatus(r);
  let h = `<h2>מעקב (רק למנהל)</h2>` + trackerHtml(r);
  if (ph === 'pick' && entries.length >= 2) h += `<div class="row-actions"><button class="btn ${st.all ? '' : 'ghost'} block" data-act="endpick">${st.all ? '✓ כולם שלחו. התחל דירוג עכשיו' : 'התחל דירוג עכשיו בכל זאת'}</button></div>`;
  if (ph === 'rate') h += `<div class="row-actions"><button class="btn ${st.all ? '' : 'ghost'} block" data-act="endrate">${st.all ? '✓ כולם נעלו. חשוף תוצאות עכשיו' : 'חשוף תוצאות עכשיו בכל זאת'}</button></div>`;
  return h;
}

function excuseRoundView(r) {
  const ph = phase(r), entries = entriesOf(r), mine = S.picks.find(p => p.rid === r.id && p.uid === me);
  let h = `<button class="back" data-act="go" data-v="home">→ כל הסבבים</button>`;
  if (ph === 'pick') {
    markSeen(r.id);
    h += `<div class="clock">נשארו <b data-ends="${r.pickEnds}">${fmtLeft(r.pickEnds - now())}</b> לשליחת משפטים. ${entries.length} כבר שלחו.</div>`;
    if (!mine) {
      h += `<div class="panel xready"><div class="xbig">🎭</div><b>סיטואציה מחכה לך</b>
        <p>יש לך <b>${timerOf(r)} שניות</b> לכתוב מה הכי מצחיק להגיד בה. הסיטואציה תיחשף רק כשתלחצו "התחל", והשעון לא עוצר, גם אם יוצאים מהמשחק.</p>
        <button class="btn block" data-act="xstart" ${busy ? 'disabled' : ''}>⏱️ התחל</button></div>`;
    } else if (xDone(mine, r) || xExpired(mine, r)) {
      const t = xText(mine);
      h += xSituation(r) + (t
        ? `<div class="panel lockcard"><div class="lk">🔒</div><b>המשפט שלך נשלח</b>${xQuote(t)}</div>`
        : `<div class="panel lockcard"><div class="lk">⌛</div><b>הזמן נגמר</b><p class="muted" style="margin:6px 0 0">לא נשלח משפט, אז לא תשתתפו בסבב הזה. בשלב הבא עדיין אפשר לדרג ולנחש.</p></div>`);
    } else {
      const k = 'xt:' + r.id, d = draft(k, () => ({ t: mine.text || '' }));
      const left = Math.max(0, xDeadline(mine, r) - now());
      h += xSituation(r) + `<div class="panel xwrite"><div class="xtimer ${left < 10500 ? 'hot' : ''}" data-xcount="${esc(r.id)}">${Math.ceil(left / 1000)}</div>
        <textarea class="field xta" data-f="${k}.t" data-xtext="${esc(r.id)}" maxlength="280" placeholder="מה אתה אומר?…">${esc(d.t)}</textarea>
        <button class="btn block" data-act="xsend" ${busy ? 'disabled' : ''}>שלח 🔒</button>
        <p class="hint" style="margin:8px 0 0">נשמר תוך כדי הקלדה. כשהזמן נגמר, מה שכתוב נשלח לבד.</p></div>`;
    }
    h += xAdminTools(r, ph, entries);
    h += `<p class="hint" style="margin-top:14px">בשלב הדירוג המשפטים מוצגים בלי שמות. מדרגים כמה הם מצחיקים, מנחשים מי כתב, ומהמרים על המנצח.</p>`;
  }
  else if (ph === 'rate') {
    h += xSituation(r);
    const order = entries.slice().sort((a, b) => hash(r.id + a.uid) - hash(r.id + b.uid));
    const sd = S.ratings.find(x => x.rid === r.id && x.uid === me) || {};
    const saved = { scores: sd.scores || {}, guesses: sd.guesses || {}, bet: sd.bet || '' };
    if (!rateDraft[r.id]) rateDraft[r.id] = JSON.parse(JSON.stringify(saved));
    const d = rateDraft[r.id];
    if (d.bet === undefined) d.bet = saved.bet;
    const others = order.filter(p => p.uid !== me);
    const cands = order.map(p => p.uid).filter(u => u !== me).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'he'));
    const doneN = others.filter(p => d.scores[p.uid] && d.scores[p.uid].fun).length;
    const locked = !!sd.locked, dis = locked ? 'disabled' : '';
    const dirty = JSON.stringify(d) !== JSON.stringify(saved);
    h += `<div class="clock">נשארו <b data-ends="${r.rateEnds}">${fmtLeft(r.rateEnds - now())}</b> לדירוג. מי ששלח משפט ולא דירג את כולם לא מקבל נקודות.</div>`;
    if (locked) h += `<div class="banner">🔒 הדירוג שלך נעול. התוצאות ייחשפו בסוף הזמן.</div>`;
    if (!order.length) h += `<p class="muted">אף אחד לא שלח משפט בסבב הזה.</p>`;
    h += order.map(p => {
      if (p.uid === me) return xCard(p, { self: true, tag: 'המשפט שלך, לא מדרגים אותו' });
      const tok = songTok(r.id, p.uid), v = d.scores[p.uid] || {};
      const gs = cands.length > 1 ? `<div class="scale"><span>🕵️ מי כתב? (בונוס)</span><div class="chips guess">${cands.map(u => `<button class="${d.guesses[p.uid] === u ? 'on' : ''}" data-act="guess" data-u="${tok}" data-g="${esc(u)}" ${dis}>${withAv(u, 'xxs')}</button>`).join('')}</div></div>` : '';
      const bet = others.length >= 2 ? `<button class="betbtn ${d.bet === p.uid ? 'on' : ''}" data-act="bet" data-u="${tok}" ${dis}>${d.bet === p.uid ? '🎰 הימרת שהמשפט הזה ינצח' : '🎰 להמר שהמשפט הזה ינצח (+1)'}</button>` : '';
      return xCard(p, { tag: v.fun ? '✓ דורג' : '', body: `<div class="rates"><div class="scale"><span>😂 כמה זה מצחיק</span>${xSlider(tok, v.fun || 0, locked)}</div>${gs}${bet}</div>` });
    }).join('');
    h += xAdminTools(r, ph, entries);
    h += `<div style="height:70px"></div>`;
    if (others.length && !locked) h += `<div class="savebar"><div class="in"><div class="prog">דירגת ${doneN} מתוך ${others.length}</div><button class="btn ghost" data-act="saverate" ${(!dirty || busy) ? 'disabled' : ''}>${dirty ? 'שמור' : 'נשמר'}</button><button class="btn" data-act="lockrate" ${(doneN < others.length || busy) ? 'disabled' : ''}>נעל 🔒</button></div></div>`;
  }
  else {
    h += xSituation(r);
    const rd = roundData(r), rows = rd.rows;
    if (!rows.length) return h + `<p class="muted">אף אחד לא שלח משפט בסבב הזה.</p>` + (isAdmin() ? `<div class="row-actions"><button class="btn ghost block danger" data-act="delround">🗑️ מחק את הסבב</button></div>` : '');
    h += `<button class="btn ghost block" data-act="replay" style="margin-bottom:14px">🎬 לצפות בחשיפה שוב</button>`;
    maybeReveal(r);
    const top = rows[0].pts;
    h += rows.map((x, i) => `<div class="res xres ${x.pts > 0 && x.pts === top ? 'win' : ''}"><div class="rk">${i + 1}</div><div><button class="who linkbtn" data-act="prof" data-v="${esc(x.uid)}">${withAv(x.uid, 'xs')}${x.uid === me ? ' (את/ה)' : ''}</button>${xQuote(x.text)}</div><div class="pts">${x.pts}</div>
      <div class="sub">${x.complete ? `<span>😂 ${x.fun.toFixed(1)}</span><span>${x.n} מדרגים</span>` : '<span style="color:var(--warn);font-weight:700">לא סיים/ה לדרג, 0 נקודות</span>'}${x.gTot ? `<span>🕵️ ${x.gRight}/${x.gTot} ניחשו</span>` : ''}${x.bets ? `<span>🎰 ${x.bets} הימרו עליו</span>` : ''}</div></div>`).join('');
    const b = Object.entries(rd.bonus).sort((a, c) => c[1] - a[1]);
    h += `<h2>בונוס ניחושים</h2>` + (b.length ? b.map(([u, c]) => `<div class="qrow"><div class="qt">${esc(nameOf(u))}</div><b>+${c}</b></div>`).join('') : `<p class="muted">אף אחד לא ניחש נכון הפעם.</p>`);
    if (Object.keys(rd.betMade).length) { const bw = Object.keys(rd.betBonus);
      h += `<h2>הימור על המנצח</h2>` + (bw.length ? bw.map(u => `<div class="qrow"><div class="qt">${esc(nameOf(u))}</div><b>+1</b></div>`).join('') : `<p class="muted">אף אחד לא הימר על המשפט המנצח.</p>`) }
    h += `<p class="hint" style="margin-top:12px">ניקוד משפט: ממוצע "כמה זה מצחיק" מכל המדרגים, מ-1 עד 10. כל ניחוש נכון והימור נכון: נקודה נוספת.</p>`;
  }
  if (isAdmin()) h += `<div class="row-actions"><button class="btn ghost block danger" data-act="delround">🗑️ מחק את הסבב</button></div>`;
  return h;
}

/* ---------- writing timer ---------- */
const xFinishing = {};
let xSaveTimer = null;
async function xFinish(r, auto) {
  if (xFinishing[r.id]) return;
  xFinishing[r.id] = 1;
  const mine = S.picks.find(p => p.rid === r.id && p.uid === me);
  const text = String(((D['xt:' + r.id] || {}).t ?? (mine && mine.text) ?? '')).trim().slice(0, 280);
  clearTimeout(xSaveTimer);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  try {
    if (text) { await db.doc('picks/' + r.id + '__' + me).update({ text, locked: true, lockedAt: now(), at: now() }); toast(auto ? '⌛ הזמן נגמר! המשפט נשלח 🔒' : 'המשפט נשלח 🔒') }
    else if (auto) toast('⌛ הזמן נגמר');
  } catch (e) { toast('השליחה לא הצליחה. בדקו חיבור לאינטרנט.'); xFinishing[r.id] = 0 }
  render();
}
function xAutosave(rid) {
  clearTimeout(xSaveTimer);
  xSaveTimer = setTimeout(() => {
    const r = S.rounds.find(x => x.id === rid), mine = r && S.picks.find(p => p.rid === rid && p.uid === me);
    if (!r || !mine || mine.locked || xExpired(mine, r)) return;
    const text = String((D['xt:' + rid] || {}).t || '').slice(0, 280);
    db.doc('picks/' + rid + '__' + me).update({ text, at: now() }).catch(() => { });
  }, 1200);
}
setInterval(() => {
  const el = document.querySelector('[data-xcount]'); if (!el) return;
  const r = S.rounds.find(x => x.id === el.dataset.xcount), p = r && S.picks.find(x => x.rid === r.id && x.uid === me);
  if (!r || !p) return;
  const left = xDeadline(p, r) - now();
  el.textContent = Math.max(0, Math.ceil(left / 1000));
  el.classList.toggle('hot', left < 10500);
  if (left <= 0) xFinish(r, true);
}, 250);

/* One-time "what's new" popup announcing the situations game. Shown once per device, on the home screen,
   before the weekly summary. Lives in its own #news layer, outside #app. */
const NEWS_KEY = 'ptv_news_x1';
let newsOn = false;
function maybeNews() {
  if (newsOn || revealOn || view.name !== 'home') return;
  try { if (localStorage.getItem(NEWS_KEY) === '1') return } catch (_) { return }
  const el = document.getElementById('news'); if (!el) return;
  newsOn = true;
  const xr = S.rounds.find(r => isX(r) && phase(r) !== 'done' && r.createdAt <= now());
  el.innerHTML = `<div class="nw-card" role="dialog" aria-modal="true" aria-labelledby="nw-t">
    <div class="tape nw-tape"><span>🎭 חדש · משחק הסיטואציות · חדש · משחק הסיטואציות · חדש · משחק הסיטואציות</span></div>
    <div class="nw-big">🎭</div>
    <div class="pill nw-pill">חדש ב־PeakTheVibe</div>
    <h2 class="display" id="nw-t">משחק הסיטואציות</h2>
    <p class="nw-lead">כל יום סיטואציה חדשה: הספד, ראיון עבודה, פגישה עם המשפחה של החברה… כותבים מה הייתם אומרים, והכי מצחיק מנצח 😅</p>
    <ul class="nw-list">
      <li><b>⏱️</b><span>הסיטואציה נחשפת רק כשלוחצים "התחל", ומשם יש לכם זמן מוגבל לכתוב</span></li>
      <li><b>😂</b><span>מדרגים כמה כל משפט מצחיק, מנחשים מי כתב ומהמרים על המנצח</span></li>
      <li><b>🏆</b><span>מובילים ותארים משלו, בנפרד ממשחק השירים</span></li>
      <li><b>🔀</b><span>עוברים בין המשחקים במתג למעלה</span></li>
    </ul>
    <button class="btn block" data-nw="go">${xr ? 'לסיטואציה של היום ←' : 'יאללה, בואו ננסה ←'}</button>
    <button class="btn ghost block" data-nw="close">אחר כך</button>
  </div>`;
  el.hidden = false; document.body.classList.add('nw-open');
  requestAnimationFrame(() => el.classList.add('on'));
  const b = el.querySelector('[data-nw=go]'); if (b) b.focus({ preventScroll: true });
}
function closeNews(go) {
  try { localStorage.setItem(NEWS_KEY, '1') } catch (_) { }
  const el = document.getElementById('news');
  if (el) { el.classList.remove('on'); el.hidden = true; el.innerHTML = '' }
  document.body.classList.remove('nw-open'); newsOn = false;
  if (go) {
    gameMode = 'excuse'; try { localStorage.setItem('ptv_mode', 'excuse') } catch (_) { }
    homeTab = 'open'; view = { name: 'home', v: null };
  }
  render(); scrollTo(0, 0);
}
(() => {
  const el = document.getElementById('news'); if (!el) return;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-nw]');
    if (b) closeNews(b.dataset.nw === 'go');
    else if (e.target === el) closeNews(false);
  });
  document.addEventListener('keydown', e => { if (newsOn && e.key === 'Escape') closeNews(false) });
})();
