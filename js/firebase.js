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
      t.set(rref, { topic, metric2, funny, lang, scale: 10, auto: true, by: 'auto', createdAt: st, pickEnds: pe, rateEnds: pe + S.settings.rateHours * 3600e3 });
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

/* ---------- identity: Google backup (admin) + restore by name (players) ----------
   authUid is the Firebase account of this browser. `me` is the player this device
   plays as: normally authUid, or, after the admin approves a restore request,
   the player it was linked to (links/{authUid}.target). Nothing in the data moves. */
let authUid = null, myLink = null, authGoogle = null, authBusy = false, linksSub = null, fbSub = null;
let myFbSub = null, myFbFor = null;
/* the player's own feedback (and the admin's replies), loaded when the feedback screen opens */
function ensureMyFeedbackSub() {
  if (!db || !me || myFbFor === me) return;
  if (myFbSub) myFbSub();
  myFbFor = me; S.myFeedback = [];
  myFbSub = db.collection('feedback').where('by', '==', me).onSnapshot(q => { S.myFeedback = q.docs.map(x => ({ id: x.id, ...x.data() })); schedule() }, () => { S.myFeedback = [] });
}
function applyLink(l) {
  const prev = myLink; myLink = l; S.loaded.link = true;
  const target = l && l.status === 'approved' && l.target ? l.target : authUid;
  if (prev && prev.status === 'pending' && !l) toast('בקשת השחזור לא אושרה');
  if (target !== me) {
    const wasLinked = me !== authUid;
    me = target;
    Object.keys(D).forEach(k => delete D[k]); Object.keys(rateDraft).forEach(k => delete rateDraft[k]);
    view = { name: 'home', v: null };
    toast(target !== authUid ? 'החשבון שוחזר. ברוך שובך!' : wasLinked ? 'השחזור בוטל במכשיר הזה' : '');
  }
  schedule();
}
function authErrorText(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  if (c === 'auth/popup-blocked') return 'הדפדפן חסם את חלון ההתחברות. אפשר חלונות קופצים ונסה שוב.';
  if (c === 'auth/operation-not-allowed') return 'התחברות עם Google לא מופעלת ב-Firebase (Authentication ← Sign-in method).';
  if (c === 'auth/unauthorized-domain') return 'צריך להוסיף את כתובת האתר ב-Firebase (Authentication ← Settings ← Authorized domains).';
  if (c === 'auth/web-storage-unsupported' || c === 'auth/operation-not-supported-in-this-environment') return 'הדפדפן הזה לא תומך בהתחברות. פתח את האתר בכרום או בספארי.';
  if (c === 'auth/credential-already-in-use' || c === 'auth/email-already-in-use') return 'חשבון ה-Google הזה כבר מחובר לשחקן אחר במשחק.';
  return 'ההתחברות לא הצליחה (' + c + '). נסה שוב, או פתח את האתר בכרום או בספארי.';
}
async function googleBackup() {
  const u = firebase.auth().currentUser; if (!u) return;
  authBusy = true;
  try {
    const res = await u.linkWithPopup(new firebase.auth.GoogleAuthProvider());
    authGoogle = (res.user.providerData || []).find(x => x.providerId === 'google.com') || null;
    toast('החשבון מגובה עם Google 🔐');
  } catch (e) { const t = authErrorText(e); if (t) alert(t) }
  finally { authBusy = false; render() }
}
async function googleSignIn() {
  const auth = firebase.auth();
  authBusy = true;
  try {
    const res = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    if (res.additionalUserInfo && res.additionalUserInfo.isNewUser) {
      // This Google account isn't connected to any player yet.
      const played = confirm('חשבון ה-Google הזה עוד לא מחובר לשום שחקן במשחק.\n\nכבר שיחקת במכשיר אחר?\n\nאישור = כן, כבר שיחקתי\nביטול = אני שחקן חדש');
      if (played) {
        // Don't leave an empty duplicate behind.
        await res.user.delete().catch(() => auth.signOut());
        alert('כדי לא לאבד את ההיסטוריה שלך:\n\n1. במכשיר הישן: פרופיל ← גבה עם Google, ואז התחבר כאן שוב.\n2. אין לך את המכשיר הישן? במסך הכניסה בחר "שחזר את החשבון שלי", והמנהל יאשר.');
      }
      // New player: keep the Google account; after reload they pick a nickname, already backed up.
    }
    location.reload();
  } catch (e) { authBusy = false; const t = authErrorText(e); if (t) alert(t) }
}

/* ---------- auth + live sync ---------- */
async function bootFirebase() {
  if (!window.firebase) { fatal = 'לא הצלחתי לטעון את Firebase. בדוק חיבור לאינטרנט.'; render(); return }
  try { firebase.initializeApp(firebaseConfig) } catch (e) { fatal = 'ה-firebaseConfig לא תקין.'; render(); return }
  const auth = firebase.auth();
  auth.onAuthStateChanged(u => {
    if (authBusy) return;
    if (!u) { auth.signInAnonymously().catch(e => { fatal = 'ההתחברות נכשלה (' + (e && e.code || '') + ').'; render() }); return }
    if (ready) { if (u.uid !== authUid) location.reload(); return }
    authUid = u.uid; me = u.uid; db = firebase.firestore(); ready = true;
    authGoogle = (u.providerData || []).find(x => x.providerId === 'google.com') || null;
    const err = e => { fatal = 'אין גישה לנתונים (' + (e && e.code || '') + '). בדוק את ה-Rules ב-Firebase.'; render() };
    db.doc('links/' + authUid).onSnapshot(s => applyLink(s.exists ? s.data() : null), () => applyLink(null));
    db.collection('rounds').onSnapshot(s => { S.rounds = s.docs.map(x => ({ id: x.id, ...x.data() })); S.loaded.rounds = true; lastSig = S.rounds.map(r => r.id + phase(r)).join(); schedule() }, err);
    db.collection('picks').onSnapshot(s => { S.picks = s.docs.map(x => x.data()); schedule() }, err);
    db.collection('ratings').onSnapshot(s => { S.ratings = s.docs.map(x => x.data()); schedule() }, err);
    db.collection('players').onSnapshot(s => { const m = {}; s.docs.forEach(x => m[x.id] = x.data()); S.players = m; S.loaded.players = true; schedule() }, err);
    db.collection('topics').onSnapshot(s => { S.topics = s.docs.map(x => ({ id: x.id, ...x.data() })); S.loaded.topics = true; schedule() }, err);
    db.doc('config/admin').onSnapshot(s => {
      S.admin = s.exists ? s.data().uid : null; S.loaded.admin = true;
      if (S.admin === me && !logsSub) logsSub = db.collection('logs').onSnapshot(q => { const m = {}; q.docs.forEach(x => m[x.id] = x.data()); S.logs = m; S.loaded.logs = true; schedule() }, () => { });
      if (S.admin === me && !fbSub) fbSub = db.collection('feedback').onSnapshot(q => { S.feedback = q.docs.map(x => ({ id: x.id, ...x.data() })); schedule() }, () => { });
      if (S.admin === me && !linksSub) linksSub = db.collection('links').onSnapshot(q => { S.links = q.docs.map(x => ({ id: x.id, ...x.data() })); schedule() }, () => { });
      schedule();
    }, err);
    db.doc('config/settings').onSnapshot(s => { S.settings = { startHour: 10, pickHours: 24, rateHours: 24, inactive: [], ...(s.exists ? s.data() : {}) }; S.loaded.settings = true; delete D.set; schedule() }, err);
    render();
  });
}
