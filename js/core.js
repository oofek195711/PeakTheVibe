const APP_VERSION = '25';     // internal build number: bump on every upload, together with ?v= in index.html
const APP_LABEL = '1.5.2';   // shown to players. 1.x.y: y = GitHub-only change, x = Firebase change (y resets to 0)
/* PeakTheVibe: constants, shared state and small utilities.
   Loaded first. All scripts are classic scripts sharing one global scope. */

const DEFAULT_M = { m: 'כמה הבחירה הצחיקה אותך', f: true };
const METRICS = [
  { m: 'כמה הבחירה הצחיקה אותך', f: true },
  { m: 'כמה זה גורם לך לבהות בגשם', f: false },
  { m: 'כמה זה נוגע ללב', f: false },
  { m: 'כמה זה מביך', f: true },
  { m: 'כמה זה מקפיץ', f: false },
  { m: 'כמה זה מקורי', f: false }
];
const SUGGEST = [
  { t: 'השיר הכי דכאוני שאתם מכירים', m: 'כמה זה גורם לך לבהות בגשם', f: false },
  { t: 'השיר הכי גרוע לשים בדייט ראשון', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר שהייתם שמים בהלוויה של חבר כדי לעצבן את המשפחה', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'השיר הכי יפה ששמעתם בחיים', m: 'כמה זה נוגע ללב', f: false },
  { t: 'שיר לפקק באיילון', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'השיר הכי מביך בפלייליסט שלכם', m: 'כמה זה מביך', f: true },
  { t: 'שיר שמתאים לבוס האחרון במשחק', m: 'כמה זה מקפיץ', f: false },
  { t: 'שיר שנשמע כאילו נכתב אחרי 4 שעות שינה', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר שמזכיר את התיכון', m: 'כמה זה נוגע ללב', f: false },
  { t: 'שיר לחדר כושר', m: 'כמה זה מקפיץ', f: false },
  { t: 'שיר שגורם לאורחים לעוף מהבית', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר לנסיעה בלילה', m: 'כמה זה גורם לך לבהות בגשם', f: false },
  { t: 'השיר הכי ישראלי שיש', m: 'כמה זה מקורי', f: false },
  { t: 'שיר שאמא שלכם אוהבת', m: 'כמה זה נוגע ללב', f: false },
  { t: 'שיר שהיה מתנגן כשאתם נכנסים לקרב', m: 'כמה זה מקפיץ', f: false },
  { t: 'שיר שמתאים לפרסומת לביטוח', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר שהיה צריך להיות פסקול החיים שלכם', m: 'כמה זה נוגע ללב', f: false },
  { t: 'השיר הכי טוב לשטיפת כלים', m: 'כמה זה מקפיץ', f: false },
  { t: 'שיר שמתאים להודעה שפוטרתם', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר שכולם מכירים ואף אחד לא יודע את המילים', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר שגורם לכם להתגעגע למישהו', m: 'כמה זה נוגע ללב', f: false },
  { t: 'שיר שמתאים לכניסה של מתאגרף', m: 'כמה זה מקפיץ', f: false },
  { t: 'שיר שהייתם שמים בחתונה של האויב שלכם', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר שמתאים לבוקר יום ראשון', m: 'כמה זה גורם לך לבהות בגשם', f: false },
  { t: 'שיר שמזכיר לכם את הצבא', m: 'כמה זה נוגע ללב', f: false },
  { t: 'שיר שאתם מתביישים שאתם אוהבים', m: 'כמה זה מביך', f: true },
  { t: 'שיר שמתאים לסצנת פרידה בטלנובלה', m: 'כמה הבחירה הצחיקה אותך', f: true },
  { t: 'שיר לנסיעה לאילת', m: 'כמה זה מקפיץ', f: false },
  { t: 'השיר הכי מוזר ששמעתם בחיים', m: 'כמה זה מקורי', f: false },
  { t: 'שיר שאפשר לשים בלופ שעה בלי להשתגע', m: 'כמה זה מקפיץ', f: false }
];
let db = null, me = null, ready = false, fatal = null;
const S = { rounds: [], picks: [], ratings: [], players: {}, topics: [], links: [], feedback: [], myFeedback: [], admin: null,
  settings: { startHour: 10, pickHours: 24, rateHours: 24, inactive: [] }, loaded: {} };
let view = { name: 'home', v: null };
let boardMode = 'week';
let homeTab = 'open';
/* Which game is on screen: 'song' (🎵 the song game) or 'excuse' (🎭 the situations game). Remembered per device. */
let gameMode = (() => { try { return localStorage.getItem('ptv_mode') === 'excuse' ? 'excuse' : 'song' } catch (_) { return 'song' } })();
const modeOf = x => x && x.mode === 'excuse' ? 'excuse' : 'song';
const isX = x => modeOf(x) === 'excuse';
const inMode = (x, m) => modeOf(x) === (m || gameMode);
const XSUGGEST = [
  'אתה נושא הספד בהלוויה.',
  'אתה פוגש בפעם הראשונה את המשפחה של החברה.',
  'אתה עומד מול שופט שמחליט אם לשלוח אותך לכלא.',
  'אתה באמצע ראיון עבודה לתפקיד חלומותיך.',
  'אתה מיילד את אשתך, והתינוק יוצא.',
  'אתה נואם בחתונה של החבר הכי טוב שלך.',
  'החברה שלך תופסת אותך בטינדר.',
  'אתה מגיע לחתונה שלך באיחור של שלוש שעות.',
  'אמא שלך מוצאת את היסטוריית החיפושים שלך.',
  'הבוס רואה אותך בחוף ביום שלקחת יום מחלה.',
  'אתה שופך קפה על הלפטופ של הבוס.',
  'אתה מגיע ליום הראשון בעבודה בפיג׳מה.',
  'ננעלת מחוץ לבית בתחתונים, והשכנה פותחת את הדלת.',
  'ההורים חוזרים מוקדם מחופשה ומוצאים מסיבה בבית.',
  'אתה בורח מדייט דרך החלון בשירותים, והיא רואה אותך.',
  'המורה תופסת אותך מעתיק במבחן.',
  'אתה זוכה באוסקר ועולה לבמה לנאום.',
  'אתה מציע נישואין מול כל המשפחה, והיא אומרת לא.',
  'אתה טייס, ומדבר לנוסעים רגע לפני נחיתת חירום.',
  'שוטר עוצר אותך על מהירות מופרזת.',
  'אתה פוגש את עצמך מהעתיד.',
  'אתה נתקע במעלית עם הבוס לשלוש שעות.',
  'התקשרת בטעות לאקסית בשלוש לפנות בוקר, והיא עונה.',
  'אתה רגע לפני ניתוח, והמנתח שואל אם יש לך שאלות אחרונות.',
  'אתה צריך להסביר לסבתא מה זה טיקטוק.',
  'אתה מגיש את חדשות הערב, והטלפרומפטר מתקלקל.',
  'אתה האדם הראשון שנוחת על מאדים, והמצלמות דולקות.',
  'אתה פוגש את הזמר האהוב עליך בשירותים.',
  'הגעת לאסיפת הורים, והמורה היא האקסית שלך.',
  'החמות שלך טועמת בפעם הראשונה אוכל שבישלת.',
  'אתה מציל בבריכה, מישהו קורא לעזרה, ואתה לא יודע לשחות.',
  'הצטרפת לזום של העבודה, והמצלמה דלקה בלי שידעת.',
  'אתה צריך לפטר את החבר הכי טוב שלך.',
  'שכחת את יום ההולדת של החברה, והיא שואלת מה קנית לה.',
  'אתה עומד לקפוץ בנג׳י, והמדריך שואל אם יש לך מילים אחרונות.'
].map(t => ({ t }));
/* Daily-round settings per game. */
function setOf(m) {
  const s = S.settings;
  return (m || gameMode) === 'excuse'
    ? { startHour: s.xStartHour ?? s.startHour, pickHours: s.xPickHours || 12, rateHours: s.xRateHours || 12, timer: s.xTimer || 90 }
    : { startHour: s.startHour, pickHours: s.pickHours, rateHours: s.rateHours };
}
const W = m => (m || gameMode) === 'excuse'
  ? { item: 'משפט', items: 'משפטים', one: 'משפט אחד', pickVerb: 'לכתיבה', pickNoun: 'לשליחת משפט', icon: '🎭', name: 'סיטואציות', topic: 'סיטואציה', topics: 'סיטואציות' }
  : { item: 'שיר', items: 'שירים', one: 'שיר אחד', pickVerb: 'לבחירה', pickNoun: 'לבחירה', icon: '🎵', name: 'שירים', topic: 'נושא', topics: 'נושאים' };
const D = {};
const rateDraft = {};
let pending = false, busy = false;
const BOOT_T0 = Date.now(); // when the page started loading, for the loading screen
const wantAdmin = /[?&]admin\b/.test(location.search);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) ? u.trim() : '';
const now = () => Date.now();
const isAdmin = () => !!me && S.admin === me;
const safePhoto = p => (typeof p === 'string' && p.length < 80000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p)) ? p : '';
const nameOf = uid => (S.players[uid] && S.players[uid].nick) || 'שחקן';
const r1 = x => Math.round(x * 10) / 10;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function phase(r) { const t = now(); return t < r.pickEnds ? 'pick' : t < r.rateEnds ? 'rate' : 'done' }
const m2of = r => r.metric2 || DEFAULT_M.m;
const funnyOf = r => r.funny !== false;
function fmtLeft(ms) {
  if (ms <= 0) return 'נגמר';
  const m = Math.ceil(ms / 60000), h = Math.floor(m / 60), mm = m % 60;
  if (h >= 48) return Math.floor(h / 24) + ' ימים';
  if (h > 0) return h + ' ש׳' + (mm ? ' ו-' + mm + ' דק׳' : '');
  return m + ' דק׳';
}
const fmtDate = t => new Date(t).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
const hh = h => String(h).padStart(2, '0') + ':00';
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime() }
function dayId(d, m) { return (m === 'excuse' ? 'x' : 'd') + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2800) }
function draft(k, init) { if (!D[k]) D[k] = init(); return D[k] }

const LANGS = { any: { l: 'כל שפה', ic: '🌍' }, he: { l: 'עברית', ic: '🇮🇱' }, en: { l: 'אנגלית', ic: '🇬🇧' } };
const langOf = r => (r && LANGS[r.lang]) ? r.lang : 'any';
