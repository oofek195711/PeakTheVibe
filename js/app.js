/* PeakTheVibe: event handling, clock, and boot. Loaded last. */

function onField(e) {
  const f = e.target.dataset.f; if (!f) return;
  const i = f.lastIndexOf('.'), k = f.slice(0, i), fld = f.slice(i + 1);
  const o = D[k] || (D[k] = {});
  if (k.startsWith('pk:') && (fld === 'title' || fld === 'artist') && o.trackId) { o.trackId = ''; o.artwork = ''; o.previewUrl = ''; o.album = ''; o.source = 'manual' }
  o[fld] = e.target.type === 'checkbox' ? e.target.checked : e.target.tagName === 'SELECT' ? +e.target.value : e.target.value;
}
app.addEventListener('input', e => { onField(e); const k = e.target.dataset && e.target.dataset.search; if (k) liveSearch(k) });
app.addEventListener('change', onField);
const maxOrder = () => S.topics.reduce((m, t) => Math.max(m, t.order || 0), 0);
const topicOf = k => ({ text: (D[k].t || '').trim().slice(0, 90), metric2: (D[k].m || '').trim().slice(0, 50) || DEFAULT_M.m, funny: !!D[k].f, lang: LANGS[D[k].lang] ? D[k].lang : 'any' });

app.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, v = b.dataset.v;
  if (a === 'go' || a === 'open' || a === 'prof') stopPreview();
  // the tap that opens unseen results also unlocks sound for the winner's song in the reveal
  if (a === 'open') { const rr = S.rounds.find(x => x.id === v); if (rr && phase(rr) === 'done' && !revealSeen(rr.id)) primeRevealAudio() }
  if (a === 'helpdone') { markHelp(); view = { name: 'home', v: null }; render(); scrollTo(0, 0) }
  else if (a === 'go') { view = { name: v, v: null }; render(); scrollTo(0, 0) }
  else if (a === 'open') { view = { name: 'round', v }; render(); scrollTo(0, 0) }
  else if (a === 'prof') { view = { name: 'profile', v }; render(); scrollTo(0, 0) }
  else if (a === 'bm') { boardMode = v; render() }
  else if (a === 'lang') { const k = b.dataset.k; if (!D[k]) return; D[k].lang = v; render() }
  else if (a === 'idea') { const x = SUGGEST.find(i => i.t === v); const k = b.dataset.k; if (!x || !D[k]) return; Object.assign(D[k], { t: x.t, m: x.m, f: x.f }); render() }
  else if (a === 'dlcsv') { downloadCsv() }
  else if (a === 'sugg') { const s = SUGGEST.find(x => x.t === v); Object.assign(D.new, { t: s.t, m: s.m, f: s.f }); render() }
  else if (a === 'metric') { const x = METRICS[+b.dataset.i]; Object.assign(D[b.dataset.k], { m: x.m, f: x.f }); render() }
  else if (a === 'claim') { await write(() => db.doc('config/admin').set({ uid: me, at: now() }), 'אתה המנהל עכשיו') }
  else if (a === 'savenick') {
    const n = (D.nick.v || '').trim(), full = (D.nick.full || '').trim();
    if (!n) { toast('צריך כינוי'); return }
    if (!full) { toast('צריך שם מלא'); return }
    const okN = await write(() => db.doc('players/' + me).set({ nick: n.slice(0, 24), fullName: full.slice(0, 40), joined: now() }));
    if (okN && !helpSeen()) { view = { name: 'help', v: null }; render(); scrollTo(0, 0) }
  }
  else if (a === 'savefull') {
    const full = (D.nick.full || '').trim(); if (!full) { toast('צריך שם מלא'); return }
    await write(() => db.doc('players/' + me).update({ fullName: full.slice(0, 40) }), 'נשמר');
  }
  else if (a === 'create') {
    const t = topicOf('new'); if (!t.text) { toast('צריך נושא'); return }
    const id = 'r' + now() + Math.random().toString(36).slice(2, 6), t0 = now(), pe = t0 + D.new.ph * 3600e3;
    const ok = await write(() => db.doc('rounds/' + id).set({ topic: t.text, metric2: t.metric2, funny: t.funny, lang: t.lang, scale: 10, by: me, createdAt: t0, pickEnds: pe, rateEnds: pe + D.new.rh * 3600e3 }), 'הסבב נפתח');
    if (ok) { delete D.new; view = { name: 'round', v: id }; render(); scrollTo(0, 0) }
  }
  else if (a === 'submittopic') {
    const t = topicOf('sg'); if (!t.text) { toast('צריך נושא'); return }
    const ok = await write(() => db.collection('topics').add({ ...t, by: me, status: 'pending', createdAt: now() }), 'נשלח למנהל לאישור');
    if (ok) { delete D.sg; render() }
  }
  else if (a === 'approve') {
    const k = 'ed:' + v, t = topicOf(k); if (!t.text) { toast('צריך נושא'); return }
    if (await write(() => db.doc('topics/' + v).update({ ...t, status: 'approved', order: maxOrder() + 1 }), 'נכנס לתור')) delete D[k];
  }
  else if (a === 'reject') { await write(() => db.doc('topics/' + v).update({ status: 'rejected' })) }
  else if (a === 'addq') {
    const t = topicOf('add'); if (!t.text) { toast('צריך נושא'); return }
    if (await write(() => db.collection('topics').add({ ...t, by: me, status: 'approved', order: maxOrder() + 1, createdAt: now() }), 'נוסף לתור')) { delete D.add; render() }
  }
  else if (a === 'qmove') {
    const Q = queue(), i = Q.findIndex(t => t.id === v), j = i + (+b.dataset.d);
    if (i < 0 || j < 0 || j >= Q.length) return;
    const ids = Q.map(t => t.id); [ids[i], ids[j]] = [ids[j], ids[i]];
    await write(() => { const w = db.batch(); ids.forEach((id, n) => w.update(db.doc('topics/' + id), { order: n + 1 })); return w.commit() });
  }
  else if (a === 'qdel') { if (confirm('למחוק את הנושא מהתור?')) await write(() => db.doc('topics/' + v).delete()) }
  else if (a === 'savesettings') {
    const s = D.set;
    await write(() => db.doc('config/settings').set({ startHour: s.sh, pickHours: s.ph, rateHours: s.rh }, { merge: true }), 'נשמר');
  }
  else if (a === 'toggleactive') {
    const F = firebase.firestore.FieldValue, isIn = inactiveSet().has(v);
    await write(() => db.doc('config/settings').set({ inactive: isIn ? F.arrayRemove(v) : F.arrayUnion(v) }, { merge: true }));
  }
  else if (a === 'nextnow') {
    const head = queue()[0];
    const t = head ? { topic: head.text, metric2: head.metric2 || DEFAULT_M.m, funny: head.funny !== false, lang: langOf(head) } : fallbackTopic('n' + now());
    if (!confirm('לפתוח עכשיו סבב עם הנושא: "' + t.topic + '"?')) return;
    const id = 'r' + now() + Math.random().toString(36).slice(2, 6), t0 = now(), pe = t0 + S.settings.pickHours * 3600e3;
    const ok = await write(() => { const w = db.batch(); w.set(db.doc('rounds/' + id), { ...t, scale: 10, by: me, createdAt: t0, pickEnds: pe, rateEnds: pe + S.settings.rateHours * 3600e3 }); if (head) w.update(db.doc('topics/' + head.id), { status: 'used', usedOn: id }); return w.commit() }, 'הסבב נפתח');
    if (ok) { view = { name: 'round', v: id }; render(); scrollTo(0, 0) }
  }
  else if (a === 'savepick' || a === 'lockpick') {
    const r = S.rounds.find(x => x.id === view.v); if (!r || phase(r) !== 'pick') { toast('זמן הבחירה נגמר'); render(); return }
    const lock = a === 'lockpick';
    const d = D['pk:' + r.id], title = (d.title || '').trim();
    if (!title) { toast('צריך שם שיר'); return }
    const url = (d.url || '').trim(); if (url && !safeUrl(url)) { toast('הלינק צריך להתחיל ב-https'); return }
    const lw = langWarning(r, title, (d.artist || '').trim());
    if (lw && !confirm('⚠️ ' + lw + '\n\nבטוח שזה השיר הנכון? אם השיר באמת ' + (langOf(r) === 'he' ? 'בעברית' : 'באנגלית') + ' ורק נכתב אחרת, אפשר להמשיך.')) return;
    if (lock && !confirm('לנעול את "' + title + '"? אחרי הנעילה אי אפשר לשנות.')) return;
    await write(() => db.doc('picks/' + r.id + '__' + me).set({ rid: r.id, uid: me, title: title.slice(0, 80), artist: (d.artist || '').trim().slice(0, 60), url, artwork: safeUrl(d.artwork || ''), previewUrl: safeUrl(d.previewUrl || ''), trackId: String(d.trackId || ''), album: String(d.album || '').slice(0, 80), source: d.trackId ? (d.source || 'apple') : 'manual', locked: lock, at: now(), ...(lock ? { lockedAt: now() } : {}) }), lock ? 'הבחירה ננעלה 🔒' : 'הטיוטה נשמרה');
  }
  else if (a === 'htab') { homeTab = v; render() }
  else if (a === 'rmphoto') { if (confirm('להסיר את תמונת הפרופיל?')) await write(() => db.doc('players/' + me).update({ photo: firebase.firestore.FieldValue.delete() }), 'התמונה הוסרה') }
  else if (a === 'glogin') { googleSignIn() }
  else if (a === 'gbackup') { googleBackup() }
  else if (a === 'reqrestore') {
    const p = S.players[v]; if (!p) return;
    if (!confirm('לשחזר את החשבון של ' + p.nick + (p.fullName ? ' (' + p.fullName + ')' : '') + '?\n\nהמנהל יקבל בקשה ויאשר.')) return;
    await write(() => db.doc('links/' + authUid).set({ target: v, status: 'pending', at: now() }), 'הבקשה נשלחה למנהל');
  }
  else if (a === 'cancelrestore') { await write(() => db.doc('links/' + authUid).delete(), 'הבקשה בוטלה') }
  else if (a === 'approvelink') {
    const l = (S.links || []).find(x => x.id === v); if (!l) return;
    const p = S.players[l.target] || {};
    if (!confirm('לאשר שהמכשיר החדש הוא ' + (p.nick || '?') + '?\n\nהמכשיר יקבל את כל ההיסטוריה ויוכל לשחק בשמו/ה.')) return;
    const F = firebase.firestore.FieldValue;
    await write(async () => {
      await db.doc('links/' + v).update({ status: 'approved', approvedAt: now(), approvedBy: me });
      if (S.players[v]) await db.doc('config/settings').set({ inactive: F.arrayUnion(v) }, { merge: true });
    }, 'אושר. החשבון נפתח אצלו/ה');
  }
  else if (a === 'rejectlink') { if (confirm('לדחות / לבטל את השחזור הזה?')) await write(() => db.doc('links/' + v).delete(), 'בוטל') }
  else if (a === 'search') { if (document.activeElement) document.activeElement.blur(); runSongSearch(b.dataset.k) }
  else if (a === 'pickres') {
    const k = b.dataset.k, st = searchState[k], x = st && st.results[+b.dataset.i]; if (!x || !D[k]) return;
    Object.assign(D[k], { title: x.title, artist: x.artist, url: x.url, artwork: x.artwork, previewUrl: x.previewUrl, trackId: x.trackId, album: x.album, source: x.source });
    delete searchState[k]; D[k].q = ''; if (document.activeElement) document.activeElement.blur(); render(); toast('נבחר: ' + x.title + '. עכשיו שומרים או נועלים.');
  }
  else if (a === 'preview') { togglePreview(v, b.dataset.tid) }
  else if (a === 'replay') { const r = S.rounds.find(x => x.id === view.v); if (r) { primeRevealAudio(); startReveal(r) } }
  else if (a === 'rate') { const d = rateDraft[view.v]; const u = uidFromTok(view.v, b.dataset.u); if (!u) return; d.scores[u] = { ...(d.scores[u] || {}), [b.dataset.k]: +b.dataset.n }; render() }
  else if (a === 'guess') { const d = rateDraft[view.v]; const u = uidFromTok(view.v, b.dataset.u); if (!u) return; d.guesses[u] = d.guesses[u] === b.dataset.g ? null : b.dataset.g; if (!d.guesses[u]) delete d.guesses[u]; render() }
  else if (a === 'saverate' || a === 'lockrate') {
    const r = S.rounds.find(x => x.id === view.v); if (!r || phase(r) !== 'rate') { toast('זמן הדירוג נגמר'); render(); return }
    const lock = a === 'lockrate';
    if (lock && !confirm('לנעול את הדירוג והניחושים? אחרי הנעילה אי אפשר לשנות.')) return;
    const d = rateDraft[r.id], scores = {}, guesses = {};
    S.picks.filter(p => p.rid === r.id && p.uid !== me).forEach(p => {
      if (d.scores[p.uid]) scores[p.uid] = { fit: d.scores[p.uid].fit || 0, fun: d.scores[p.uid].fun || 0 };
      if (d.guesses[p.uid]) guesses[p.uid] = d.guesses[p.uid];
    });
    rateDraft[r.id] = { scores: JSON.parse(JSON.stringify(scores)), guesses: { ...guesses } };
    const okR = await write(() => db.doc('ratings/' + r.id + '__' + me).set({ rid: r.id, uid: me, scores, guesses, locked: lock, at: now() }), lock ? 'הדירוג ננעל 🔒' : 'נשמר');
    if (okR && lock) { stopPreview(); view = { name: 'home', v: null }; render(); scrollTo(0, 0) }
  }
  else if (a === 'endpick') { const r = S.rounds.find(x => x.id === view.v); if (!r) return;
    const st = roundStatus(r);
    if (!st.all) {
      const miss = st.groups.filter(g => g.l !== 'נעלו').flatMap(g => g.u);
      const none = st.groups.filter(g => g.l === 'נכנסו ועוד לא בחרו' || g.l === 'עוד לא נכנסו').flatMap(g => g.u);
      if (!confirm(`עוד לא כולם נעלו (${miss.length}: ${miss.map(nameOf).join(', ')}).\n\nמי ששמר טיוטה ישתתף עם הטיוטה. מי שלא בחר בכלל${none.length ? ' (' + none.map(nameOf).join(', ') + ')' : ''} לא ישתתף בסבב.\n\nלעבור לדירוג בכל זאת?`)) return;
    }
    const t = now(); await write(() => db.doc('rounds/' + r.id).update({ pickEnds: t, rateEnds: t + (r.rateEnds - r.pickEnds) }), 'שלב הדירוג התחיל') }
  else if (a === 'endrate') { const r = S.rounds.find(x => x.id === view.v); if (!r) return;
    const st = roundStatus(r);
    if (!st.all) {
      const miss = st.groups.filter(g => g.l !== 'נעלו דירוג').flatMap(g => g.u).filter(u => st.pickers.has(u));
      if (!confirm(`עוד לא כולם נעלו את הדירוג (${miss.length}: ${miss.map(nameOf).join(', ')}).\n\nמי שבחר שיר ולא דירג את כל השירים יקבל 0.\n\nלחשוף תוצאות בכל זאת?`)) return;
    } await write(() => db.doc('rounds/' + r.id).update({ rateEnds: now() }), 'התוצאות נחשפו') }
  else if (a === 'copylist') {
    const r = S.rounds.find(x => x.id === view.v); if (!r) return;
    const ps = S.picks.filter(p => p.rid === r.id);
    const txt = r.topic + '\n' + ps.map(p => '• ' + p.title + (p.artist ? ' / ' + p.artist : '') + (safeUrl(p.url) ? ' ' + safeUrl(p.url) : '')).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('הרשימה הועתקה') } catch (_) { toast('לא הצלחתי להעתיק במכשיר הזה') }
  }
});

/* ---------- clock ---------- */
let lastSig = '';
setInterval(() => {
  document.querySelectorAll('[data-ends]').forEach(el => el.textContent = fmtLeft(+el.dataset.ends - now()));
  const sig = S.rounds.map(r => r.id + phase(r)).join();
  if (sig !== lastSig) { lastSig = sig; if (ready) schedule() } else ensureToday();
}, 15000);

/* Enter in the song search box runs the search */
app.addEventListener('keydown', e => {
  const k = e.target && e.target.dataset && e.target.dataset.search;
  if (k && e.key === 'Enter') { e.preventDefault(); e.target.blur(); runSongSearch(k) }
});
/* Reveal layer: skip / finish */
document.getElementById('reveal').addEventListener('click', e => { if (e.target.closest('[data-rv="skip"]')) closeReveal() });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && revealOn) closeReveal() });

/* Profile photo: crop to a square, shrink to 128px JPEG (a few KB) and store it on the player record. */
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight), size = 128;
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d');
      g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      let q = 0.85, out = c.toDataURL('image/jpeg', q);
      while (out.length > 60000 && q > 0.4) { q -= 0.15; out = c.toDataURL('image/jpeg', q) }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')) };
    img.src = url;
  });
}
app.addEventListener('change', async e => {
  const inp = e.target; if (!inp.dataset || !inp.dataset.photo || !inp.files || !inp.files[0]) return;
  try {
    const data = await shrinkPhoto(inp.files[0]);
    if (!safePhoto(data)) throw new Error('bad');
    await write(() => db.doc('players/' + me).update({ photo: data }), 'התמונה עודכנה');
  } catch (_) { toast('לא הצלחתי לטעון את התמונה. נסו תמונה אחרת.') }
  inp.value = '';
});

/* ---------- 1-10 slider ----------
   A horizontal drag moves it; a vertical swipe scrolls the page and leaves it alone;
   a tap jumps to that spot. Right = 1, left = 10 (same direction as the old 1-5 buttons). */
let slideSt = null;
function sliderVal(el, x) {
  const r = el.querySelector('.trk').getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (r.right - x) / r.width));
  return Math.round(1 + f * 9);
}
function paintSlider(el, val) {
  el.classList.add('set'); el.style.setProperty('--p', (val - 1) / 9);
  el.querySelector('.sval').textContent = val; el.setAttribute('aria-valuenow', val);
}
function commitSlider(el, val) {
  const d = rateDraft[view.v], u = uidFromTok(view.v, el.dataset.slide);
  if (!d || !u || !val) return;
  d.scores[u] = { ...(d.scores[u] || {}), [el.dataset.k]: val };
  render();
}
app.addEventListener('pointerdown', e => {
  const el = e.target.closest && e.target.closest('.slider');
  if (!el || el.classList.contains('dis') || !e.target.closest('.trk')) return;
  slideSt = { el, id: e.pointerId, x0: e.clientX, y0: e.clientY, drag: false, val: 0 };
});
document.addEventListener('pointermove', e => {
  const st = slideSt; if (!st || e.pointerId !== st.id) return;
  const dx = Math.abs(e.clientX - st.x0), dy = Math.abs(e.clientY - st.y0);
  if (!st.drag) {
    if (dx > 6 && dx > dy) { st.drag = true; try { st.el.setPointerCapture(e.pointerId) } catch (_) { } }
    else { if (dy > 8) slideSt = null; return }
  }
  e.preventDefault();
  st.val = sliderVal(st.el, e.clientX); paintSlider(st.el, st.val);
}, { passive: false });
document.addEventListener('pointerup', e => {
  const st = slideSt; if (!st || e.pointerId !== st.id) return;
  slideSt = null;
  commitSlider(st.el, st.drag ? st.val : sliderVal(st.el, e.clientX));
});
document.addEventListener('pointercancel', e => {
  const st = slideSt; if (!st || e.pointerId !== st.id) return;
  slideSt = null;
  if (st.drag && st.val) commitSlider(st.el, st.val); else render();
});
app.addEventListener('keydown', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('slider') || el.classList.contains('dis')) return;
  const cur = +el.getAttribute('aria-valuenow') || 5;
  const map = { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1 };
  let val = null;
  if (e.key in map) val = Math.max(1, Math.min(10, cur + map[e.key]));
  else if (e.key === 'Home') val = 1; else if (e.key === 'End') val = 10;
  if (val === null) return;
  e.preventDefault(); const k = el.dataset.k, tok = el.dataset.slide;
  commitSlider(el, val);
  const again = app.querySelector('.slider[data-slide="' + tok + '"][data-k="' + k + '"]'); if (again) again.focus();
});

/* ---------- boot ---------- */
bootFirebase();
