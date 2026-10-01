/* PeakTheVibe: Firebase config and data layer. Writes, daily round creation, admin log, live sync. */


const firebaseConfig = {
  apiKey: "AIzaSyAeQVZibOR-alTk5BtmCvkBYla9wl20sMw",
  authDomain: "peakthevibe.firebaseapp.com",
  projectId: "peakthevibe",
  storageBucket: "peakthevibe.firebasestorage.app",
  messagingSenderId: "65914699449",
  appId: "1:65914699449:web:fc6abe1c754deb497d6568"
};

const seenMarked = {};
function markSeen(rid) {
  if (seenMarked[rid] || !S.players[me]) return;
  const s = S.players[me].seen; seenMarked[rid] = 1;
  if (s && s[rid]) return;
  db.doc('players/' + me).update(new firebase.firestore.FieldPath('seen', rid), now()).catch(() => { seenMarked[rid] = 0 });
}
let logsSub = null; const logTried = {};
function ensureLogs() {
  if (!isAdmin() || !S.loaded.logs) return;
  doneRounds().forEach(r => {
    if (S.logs[r.id] || logTried[r.id]) return;
    logTried[r.id] = 1;
    db.doc('logs/' + r.id).set(buildLog(r)).catch(() => { setTimeout(() => { logTried[r.id] = 0 }, 30000) });
  });
}
const attempted = {};
async function ensureToday() {
  if (!ready || !S.loaded.rounds || !S.loaded.topics || !S.loaded.settings) return;
  const today = new Date(), st = startOf(today);
  if (now() < st) return;
  const id = dayId(today);
  if (S.rounds.some(r => r.id === id) || attempted[id]) return;
  attempted[id] = true;
  const head = queue()[0];
  let topic, metric2, funny, tref = null;
  let lang = 'any';
  if (head) { topic = head.text; metric2 = head.metric2 || DEFAULT_M.m; funny = head.funny !== false; lang = langOf(head); tref = db.doc('topics/' + head.id) }
  else {
    ({ topic, metric2, funny } = fallbackTopic(id));
  }
  const pe = st + S.settings.pickHours * 3600e3;
  const rref = db.doc('rounds/' + id);
  try {
    await db.runTransaction(async t => {
      const rs = await t.get(rref);
      if (rs.exists) return;
      if (tref) { const ts = await t.get(tref); if (!ts.exists || ts.data().status !== 'approved') throw new Error('stale') }
      t.set(rref, { topic, metric2, funny, lang, auto: true, by: 'auto', createdAt: st, pickEnds: pe, rateEnds: pe + S.settings.rateHours * 3600e3 });
      if (tref) t.update(tref, { status: 'used', usedOn: id });
    });
  } catch (e) { setTimeout(() => { attempted[id] = false }, 20000) }
}
async function write(fn, okMsg) {
  busy = true; render();
  try { await fn(); if (okMsg) toast(okMsg); return true }
  catch (e) {
    const c = e && e.code;
    if (c === 'permission-denied') toast('אין הרשאה לפעולה הזו.');
    else if (c === 'unavailable') toast('אין חיבור לאינטרנט. נסה שוב.');
    else if (c === 'resource-exhausted') toast('הגעתם למכסה החינמית להיום.');
    else toast('השמירה לא הצליחה. נסה שוב.');
    return false;
  } finally { busy = false; render() }
}

/* ---------- auth + live sync ---------- */
async function bootFirebase() {
  if (!window.firebase) { fatal = 'לא הצלחתי לטעון את Firebase. בדוק חיבור לאינטרנט.'; render(); return }
  try { firebase.initializeApp(firebaseConfig) } catch (e) { fatal = 'ה-firebaseConfig לא תקין.'; render(); return }
  const auth = firebase.auth();
  auth.onAuthStateChanged(u => {
    if (!u || ready) return;
    me = u.uid; db = firebase.firestore(); ready = true;
    const err = e => { fatal = 'אין גישה לנתונים (' + (e && e.code || '') + '). בדוק את ה-Rules ב-Firebase.'; render() };
    db.collection('rounds').onSnapshot(s => { S.rounds = s.docs.map(x => ({ id: x.id, ...x.data() })); S.loaded.rounds = true; lastSig = S.rounds.map(r => r.id + phase(r)).join(); schedule() }, err);
    db.collection('picks').onSnapshot(s => { S.picks = s.docs.map(x => x.data()); schedule() }, err);
    db.collection('ratings').onSnapshot(s => { S.ratings = s.docs.map(x => x.data()); schedule() }, err);
    db.collection('players').onSnapshot(s => { const m = {}; s.docs.forEach(x => m[x.id] = x.data()); S.players = m; S.loaded.players = true; schedule() }, err);
    db.collection('topics').onSnapshot(s => { S.topics = s.docs.map(x => ({ id: x.id, ...x.data() })); S.loaded.topics = true; schedule() }, err);
    db.doc('config/admin').onSnapshot(s => {
      S.admin = s.exists ? s.data().uid : null; S.loaded.admin = true;
      if (S.admin === me && !logsSub) logsSub = db.collection('logs').onSnapshot(q => { const m = {}; q.docs.forEach(x => m[x.id] = x.data()); S.logs = m; S.loaded.logs = true; schedule() }, () => { });
      schedule();
    }, err);
    db.doc('config/settings').onSnapshot(s => { S.settings = { startHour: 10, pickHours: 24, rateHours: 24, inactive: [], ...(s.exists ? s.data() : {}) }; S.loaded.settings = true; delete D.set; schedule() }, err);
    render();
  });
  try { await auth.signInAnonymously() }
  catch (e) { fatal = 'ההתחברות נכשלה (' + (e && e.code || '') + ').'; render() }
}
