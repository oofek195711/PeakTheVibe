/* PeakTheVibe: song helpers. Link parsing, song identity keys, music search. */

function ytId(u) { const m = (u || '').match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : null }
function songKeys(p) {
  const k = [], u = safeUrl(p.url);
  const y = ytId(u); if (y) k.push('yt:' + y);
  const sp = u.match(/spotify\.com\/(?:intl-[\w-]+\/)?track\/(\w+)/); if (sp) k.push('sp:' + sp[1]);
  const am = u.match(/[?&]i=(\d+)/); if (am && /apple\.com/.test(u)) k.push('am:' + am[1]);
  const norm = s => (s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (p.trackId) k.push('it:' + p.trackId);
  const t = norm(p.title); if (t) k.push('tx:' + t + '|' + norm(p.artist));
  return k;
}

/* ---------- song search ----------
   Two free sources, no keys: Apple (iTunes Search API) first, Deezer as automatic fallback.
   Uses the iTunes Search API: free, no API key, no secrets in the frontend.
   It is called through JSONP (a <script> tag with a callback), which works from
   GitHub Pages without any CORS setup. Each song card links to the song itself
   plus searches on Spotify, YouTube and Apple Music.
   Spotify and YouTube search both require secret credentials and a backend,
   so they are intentionally not used here. */
const searchState = {}; // per pick-draft key: { q, loading, error, results }
/* Generic JSONP loader: injects a <script> whose response calls back into the page. */
function jsonp(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cb = 'ptvCb' + Date.now() + Math.floor(Math.random() * 1e5);
    const tag = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')) }, timeoutMs || 6000);
    function cleanup() { clearTimeout(timer); try { delete window[cb] } catch (_) { window[cb] = undefined } tag.remove() }
    window[cb] = data => { cleanup(); resolve(data) };
    tag.onerror = () => { cleanup(); reject(new Error('blocked')) };
    tag.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(tag);
  });
}
const ITUNES_URL = 'https://itunes.apple.com/search?media=music&entity=song&limit=12&country=IL&term=';
/* Apple: try a normal request first, then JSONP. Returns raw iTunes results. */
async function itunesSearch(term) {
  const url = ITUNES_URL + encodeURIComponent(term);
  let fetchErr = '';
  try {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), 6000);
    try {
      const r = await fetch(url, ctl ? { signal: ctl.signal } : {});
      if (!r.ok) throw new Error('http' + r.status);
      const d = await r.json();
      return (d && d.results) || [];
    } finally { clearTimeout(t) }
  } catch (e) {
    fetchErr = shortErr(e);
    try {
      const d = await jsonp(url, 6000);
      return (d && d.results) || [];
    } catch (e2) { throw new Error('fetch=' + fetchErr + ' jsonp=' + shortErr(e2)) }
  }
}
const shortErr = e => String((e && (e.name === 'AbortError' ? 'timeout' : e.message)) || 'error').slice(0, 40);
function songFromItunes(x) {
  const art = String(x.artworkUrl100 || '').replace(/\/\d+x\d+bb\./, '/300x300bb.');
  return {
    title: String(x.trackName || '').slice(0, 80),
    artist: String(x.artistName || '').slice(0, 60),
    url: safeUrl(x.trackViewUrl || ''),
    artwork: safeUrl(art),
    previewUrl: safeUrl(x.previewUrl || ''),
    trackId: String(x.trackId || ''),
    album: String(x.collectionName || '').slice(0, 80),
    source: 'apple'
  };
}
/* Deezer: free, no key, JSONP. Returns normalized songs. */
async function deezerSearch(term) {
  const d = await jsonp('https://api.deezer.com/search?limit=12&output=jsonp&q=' + encodeURIComponent(term), 6000);
  if (!d || d.error) throw new Error('deezer' + (d && d.error && d.error.code ? d.error.code : ''));
  return (d.data || []).map(songFromDeezer);
}
function songFromDeezer(x) {
  const al = x.album || {}, ar = x.artist || {};
  return {
    title: String(x.title || '').slice(0, 80),
    artist: String(ar.name || '').slice(0, 60),
    url: safeUrl(x.link || ''),
    artwork: safeUrl(al.cover_big || al.cover_medium || ''),
    previewUrl: safeUrl(x.preview || ''),
    trackId: x.id ? 'dz' + x.id : '',
    album: String(al.title || '').slice(0, 80),
    source: 'deezer'
  };
}
/* Tries the source that last worked on this device first, falls back to the other.
   Throws an error whose message lists what failed, e.g. "itunes:blocked, deezer:timeout". */
let preferredSource = null;
async function musicSearch(term) {
  const order = preferredSource === 'deezer' ? ['deezer', 'itunes'] : ['itunes', 'deezer'];
  const errs = []; let empty = null;
  for (const src of order) {
    try {
      const list = src === 'itunes' ? (await itunesSearch(term)).map(songFromItunes) : await deezerSearch(term);
      noteSearchDiag(src, 'ok');
      preferredSource = src;
      if (list.length) return list;
      empty = list;
    } catch (e) { const m = (e && e.message) || 'error'; errs.push(src + ':' + m); noteSearchDiag(src, m) }
  }
  if (empty) return empty;
  throw new Error(errs.join(', '));
}
const NO_RESULTS = 'לא נמצאו תוצאות. שירים ישראליים רשומים לפעמים באנגלית, נסו גם כך (למשל Sigapo), או הוסיפו את השיר ידנית.';

/* ---------- search diagnostics ----------
   Remembers, per device, whether Apple / Deezer answered, and saves it once per
   change on the player's own record so the admin can see which devices are blocked. */
const searchDiag = {};
let diagSaved = '';
function deviceLabel() {
  const ua = navigator.userAgent || '';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'אחר';
  const iosv = (ua.match(/OS (\d+)_/) || [])[1];
  const br = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /WhatsApp/.test(ua) ? 'WhatsApp' : /CriOS/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /EdgiOS|Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'דפדפן';
  const home = (window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? ', מסך הבית' : '';
  return os + (iosv && (os === 'iPhone' || os === 'iPad') ? ' ' + iosv : '') + ', ' + br + home;
}
function noteSearchDiag(src, status) {
  searchDiag[src] = String(status).slice(0, 90);
  const d = { itunes: searchDiag.itunes || '', deezer: searchDiag.deezer || '', device: deviceLabel(), ver: APP_LABEL };
  const sig = d.itunes + '|' + d.deezer + '|' + d.device + '|' + d.ver;
  if (sig === diagSaved || !db || !me || !S.players[me]) return;
  diagSaved = sig;
  db.doc('players/' + me).update({ diag: { ...d, at: now() } }).catch(() => { diagSaved = '' });
}

const searchCache = new Map();
let searchTimer = null;
/* Called on every keystroke: waits until typing pauses, then searches. */
function liveSearch(key) {
  clearTimeout(searchTimer);
  const q = ((D[key] && D[key].q) || '').trim();
  if (q.length < 2) { delete searchState[key]; updateSearchResults(key); return }
  searchTimer = setTimeout(() => runSongSearch(key), 450);
}
async function runSongSearch(key) {
  clearTimeout(searchTimer);
  const d = D[key]; if (!d) return;
  const q = (d.q || '').trim();
  if (q.length < 2) { delete searchState[key]; updateSearchResults(key); return }
  const cached = searchCache.get(q.toLowerCase());
  if (cached) { searchState[key] = { q, loading: false, results: cached, error: cached.length ? '' : NO_RESULTS }; updateSearchResults(key); return }
  const prev = searchState[key];
  searchState[key] = { q, loading: true, results: prev ? prev.results : [], error: '' };
  updateSearchResults(key);
  try {
    const res = await musicSearch(q);
    const seen = new Set(), list = [];
    res.forEach(s => { const id = s.trackId || s.title + s.artist; if (s.title && !seen.has(id)) { seen.add(id); list.push(s) } });
    const top = list.slice(0, 10);
    searchCache.set(q.toLowerCase(), top);
    if (!searchState[key] || searchState[key].q !== q) return; // a newer search is already running
    searchState[key] = { q, loading: false, results: top, error: top.length ? '' : NO_RESULTS };
  } catch (e) {
    if (!searchState[key] || searchState[key].q !== q) return;
    searchState[key] = { q, loading: false, results: [], error: 'החיפוש לא הצליח. בדקו חיבור לאינטרנט, או הוסיפו את השיר ידנית.', code: String((e && e.message) || '') };
  }
  updateSearchResults(key);
}
/* Updates only the results box, so the search field keeps focus and the keyboard stays open. */
function updateSearchResults(key) {
  const box = app.querySelector('[data-sr="' + key + '"]');
  if (box) box.innerHTML = searchResultsHtml(key); else render();
}

/* ---------- 30-second previews ----------
   Apple preview links are permanent. Deezer preview links carry a token that
   expires, so for Deezer songs we ask Deezer for a fresh link at play time.
   `key` is the saved preview link, used only to know which button is active. */
let previewAudio = null, previewPlaying = '', previewLoading = '';
async function freshDeezerPreview(tid) {
  const id = String(tid || '').replace(/^dz/, '');
  if (!/^\d+$/.test(id)) return '';
  const d = await jsonp('https://api.deezer.com/track/' + id + '?output=jsonp', 6000);
  return safeUrl((d && d.preview) || '');
}
async function togglePreview(key, tid) {
  if (!key) return;
  if (!previewAudio) {
    previewAudio = new Audio();
    previewAudio.addEventListener('ended', () => { previewPlaying = ''; render() });
  }
  if (previewPlaying === key || previewLoading === key) { previewAudio.pause(); previewPlaying = ''; previewLoading = ''; render(); return }
  previewAudio.pause(); previewPlaying = ''; previewLoading = key; render();
  let src = key;
  try {
    if (String(tid || '').startsWith('dz')) src = (await freshDeezerPreview(tid)) || '';
    if (previewLoading !== key) return; // user tapped something else meanwhile
    if (!src) throw new Error('no preview');
    previewAudio.src = src;
    await previewAudio.play();
    if (previewLoading !== key) { previewAudio.pause(); return }
    previewLoading = ''; previewPlaying = key;
  } catch (e) {
    if (previewLoading === key) { previewLoading = ''; previewPlaying = ''; toast('אין קטע האזנה לשיר הזה. אפשר לפתוח אותו באחת האפליקציות שמתחת.') }
  }
  render();
}
function stopPreview() { if (previewAudio) previewAudio.pause(); previewPlaying = ''; previewLoading = '' }

/* ---------- winner's song during the results reveal ----------
   Phones only allow sound that starts from a tap. The reveal begins a few seconds
   after the tap, so the tap that opens it "unlocks" a dedicated audio element first. */
let revealAudio = null;
const SILENT_WAV = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
function primeRevealAudio() {
  try {
    if (!revealAudio) revealAudio = new Audio();
    revealAudio.muted = true; revealAudio.src = SILENT_WAV;
    const p = revealAudio.play();
    if (p) p.then(() => { revealAudio.pause(); revealAudio.muted = false }).catch(() => { revealAudio.muted = false });
  } catch (_) { }
}
async function playRevealSong(p, timers) {
  try {
    let src = safeUrl(p.previewUrl);
    if (!src) return;
    if (String(p.trackId || '').startsWith('dz')) src = (await freshDeezerPreview(p.trackId)) || '';
    if (!src || !revealOn) return;
    if (!revealAudio) revealAudio = new Audio();
    stopPreview();
    revealAudio.muted = false; revealAudio.src = src;
    try { revealAudio.volume = 0 } catch (_) { }
    await revealAudio.play();
    let v = 0;
    const fade = setInterval(() => { v = Math.min(1, v + 0.08); try { revealAudio.volume = v } catch (_) { } if (v >= 1) clearInterval(fade) }, 120);
    if (timers) timers.push(fade);
  } catch (_) { }
}
function stopRevealSong() { if (revealAudio) { try { revealAudio.pause() } catch (_) { } } }
