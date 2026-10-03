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
   GitHub Pages without any CORS setup. Results link to Apple Music; the
   "all apps" link (song.link) lets each player open the same song in Spotify,
   YouTube Music, etc.
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
    const d = await jsonp(url, 6000);
    return (d && d.results) || [];
  }
}
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
      preferredSource = src;
      if (list.length) return list;
      empty = list;
    } catch (e) { errs.push(src + ':' + ((e && e.message) || 'error')) }
  }
  if (empty) return empty;
  throw new Error(errs.join(', '));
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
  if (cached) { searchState[key] = { q, loading: false, results: cached, error: cached.length ? '' : 'לא נמצאו תוצאות. נסו לנסח אחרת, או הוסיפו את השיר ידנית.' }; updateSearchResults(key); return }
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
    searchState[key] = { q, loading: false, results: top, error: top.length ? '' : 'לא נמצאו תוצאות. נסו לנסח אחרת, או הוסיפו את השיר ידנית.' };
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

/* ---------- 30-second previews ---------- */
let previewAudio = null, previewPlaying = '';
function togglePreview(url) {
  if (!url) return;
  if (!previewAudio) { previewAudio = new Audio(); previewAudio.addEventListener('ended', () => { previewPlaying = ''; render() }) }
  if (previewPlaying === url) { previewAudio.pause(); previewPlaying = '' }
  else { previewAudio.src = url; previewAudio.play().catch(() => toast('לא הצלחתי לנגן קטע')); previewPlaying = url }
  render();
}
function stopPreview() { if (previewAudio && previewPlaying) { previewAudio.pause(); previewPlaying = '' } }
