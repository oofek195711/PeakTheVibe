/* PeakTheVibe: rendering. Every screen and component. */

const app = document.getElementById('app');
function ideaChips(key) {
  const norm = x => (x || '').trim();
  const used = new Set([...S.rounds.map(r => norm(r.topic)), ...S.topics.map(t => norm(t.text))]);
  const ideas = SUGGEST.filter(x => !used.has(x.t));
  if (!ideas.length) return '';
  const day = new Date().toDateString();
  const list = ideas.slice().sort((a, b) => hash(a.t + day + key) - hash(b.t + day + key)).slice(0, 5);
  return `<p class="hint" style="margin:-6px 0 8px">רעיונות לדוגמה, לחיצה ממלאת:</p><div class="chips">${list.map(x => `<button data-act="idea" data-k="${esc(key)}" data-v="${esc(x.t)}">${esc(x.t)}</button>`).join('')}</div>`;
}

/* Where a song can be opened: its own link (labelled by platform), plus searches on the big apps. */
function linkLabel(u) {
  return /music\.apple\.com|itunes\.apple\.com/.test(u) ? 'Apple Music' : /spotify\.com/.test(u) ? 'Spotify' : /youtu\.?be/.test(u) ? 'YouTube' : /deezer\.com/.test(u) ? 'Deezer' : '▶ הלינק';
}
function songLinkList(p) {
  const q = encodeURIComponent((p.title + ' ' + (p.artist || '')).trim()), u = safeUrl(p.url);
  const own = u ? linkLabel(u) : '';
  const L = [];
  if (u) L.push([own, u]);
  if (own !== 'Spotify') L.push(['Spotify', 'https://open.spotify.com/search/' + q]);
  if (own !== 'YouTube') L.push(['YouTube', 'https://www.youtube.com/results?search_query=' + q]);
  if (own !== 'Apple Music') L.push(['Apple Music', 'https://music.apple.com/search?term=' + q]);
  return L.map(([t, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('');
}
function linksHtml(p) { return '<div class="links">' + songLinkList(p) + '</div>' }
function playlistHead(picks) {
  const sm = 'style="min-height:40px;padding:8px 14px;font-size:14px"';
  return `<div class="head"><span class="muted" style="font-size:14px">${picks.length === 1 ? 'שיר אחד' : picks.length + ' שירים'}</span><button class="btn ghost" ${sm} data-act="copylist">העתק רשימה</button></div>`;
}

function trackerHtml(r) {
  const t = roundStatus(r);
  return `<div class="track"><div class="tcount">${t.groups.map(g => `<span>${g.ic} ${g.u.length}</span>`).join('')}</div>
  ${t.groups.filter(g => g.u.length).map(g => `<div class="tg"><small>${g.ic} ${g.l}</small><div>${g.u.map(u => esc(nameOf(u)) + (t.ph === 'rate' && !t.pickers.has(u) ? ' <span class="muted">(לא בחר/ה שיר)</span>' : '')).join(', ')}</div></div>`).join('')}
  ${t.ph === 'rate' ? '<p class="hint" style="margin:6px 0 0">"כולם נעלו" נבדק רק אצל מי שבחר שיר.</p>' : ''}
  <div class="row-actions remind"><button class="btn" style="flex:1" data-act="remindwa" data-v="${esc(r.id)}">📣 שלח תזכורת בוואטסאפ</button><button class="btn ghost" data-act="remindcopy" data-v="${esc(r.id)}" aria-label="העתק תזכורת">📋</button></div></div>`;
}
function historyView() {
  const L = Object.values(S.logs || {}).sort((a, b) => b.createdAt - a.createdAt);
  let h = `<button class="back" data-act="go" data-v="admin">→ ניהול</button><div class="display" style="font-size:48px;margin:4px 0 6px">היסטוריה</div>
  <p class="hint" style="margin:0 0 14px">רק אתה רואה את זה. התוצאות נשמרות כאן אוטומטית בסוף כל סבב, כפי שהיו באותו רגע, גם אם הסבב יימחק אחר כך.</p>`;
  if (!L.length) return h + `<p class="muted">עוד אין סבבים שהסתיימו.</p>`;
  h += `<button class="btn ghost block" data-act="dlcsv" style="margin-bottom:14px">הורד הכל כקובץ אקסל (CSV)</button>`;
  h += L.map(l => `<details data-k="log-${esc(l.rid)}" class="panel" style="margin-bottom:10px"><summary><span><b>${esc(l.topic)}</b><small class="muted" style="display:block;font-size:13px">${fmtDate(l.createdAt)} · ${esc(l.metric2)} · ${l.results.length} שירים</small></span></summary>
    <div style="margin-top:10px">${l.results.map(x => `<div class="logrow"><b>${x.rank}. ${esc(x.nick)}</b> <span class="muted">${esc(x.title)}${x.artist ? ' / ' + esc(x.artist) : ''}</span><div class="muted" style="font-size:13px">${x.pts} נק׳ · 🎯 ${x.fit} · ✨ ${x.fun} · ${x.raters} מדרגים · 🕵️ ${x.guessedRight}/${x.guessedTotal}${x.complete ? '' : ' · לא סיים לדרג'}${x.hive ? ' · 🐑' : ''}</div></div>`).join('')}
    ${l.bonus.length ? `<div class="logrow"><b>בונוס ניחושים:</b> ${l.bonus.map(b => esc(b.nick) + ' +' + b.bonus).join(', ')}</div>` : ''}
    <details data-k="logr-${esc(l.rid)}" style="margin-top:8px"><summary class="muted" style="font-size:14px">כל הדירוגים והניחושים</summary>${l.ratings.map(r => `<div class="logrow"><b>${esc(r.rater)}</b>${r.locked ? ' 🔒' : ''}<div class="muted" style="font-size:13px">${r.scores.map(s => esc(s.song) + ': 🎯' + s.fit + ' ✨' + s.fun).join(' | ')}</div>${r.guesses.length ? `<div class="muted" style="font-size:13px">ניחושים: ${r.guesses.map(g => esc(g.song) + ' ← ' + esc(g.guess) + (g.right ? ' ✓' : ' ✗')).join(' | ')}</div>` : ''}</div>`).join('')}</details></div></details>`).join('');
  return h;
}
function downloadCsv() {
  const L = Object.values(S.logs || {}).sort((a, b) => a.createdAt - b.createdAt);
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['תאריך', 'נושא', 'מדד שני', 'מקום', 'שחקן', 'שיר', 'אמן', 'לינק', 'התאמה', 'מדד שני (ממוצע)', 'מדרגים', 'נקודות', 'סיים לדרג', 'ניחשו נכון', 'ניחושים עליו', 'בונוס ניחושים']];
  L.forEach(l => l.results.forEach(x => rows.push([new Date(l.createdAt).toLocaleDateString('he-IL'), l.topic, l.metric2, x.rank, x.nick, x.title, x.artist, x.url, x.fit, x.fun, x.raters, x.pts, x.complete ? 'כן' : 'לא', x.guessedRight, x.guessedTotal, (l.bonus.find(b => b.uid === x.uid) || {}).bonus || 0])));
  const blob = new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'PeakTheVibe-history.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000);
}

/* ---------- rendering ---------- */
function schedule() {
  if (slideSt) { pending = true; return } // never redraw under a finger that is dragging a slider
  const a = document.activeElement;
  if (a && app.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { pending = true } else render();
  ensureToday();
  ensureLogs();
}
app.addEventListener('focusout', () => { if (!pending) return; setTimeout(() => { const a = document.activeElement; if (pending && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { pending = false; render() } }, 0) });

function nav() {
  const tab = (n, t) => `<button class="tab ${view.name === n ? 'on' : ''}" data-act="go" data-v="${n}">${t}</button>`;
  const np = pendingTopics().length + (isAdmin() ? (S.feedback || []).filter(f => f.status === 'new').length : 0);
  const mid = isAdmin()
    ? `<button class="btn add" data-act="go" data-v="admin">ניהול${np ? ' (' + np + ')' : ''}</button>`
    : `<button class="btn add" data-act="go" data-v="suggest">הצע נושא +</button>`;
  return `<nav class="nav"><div class="in">${tab('home', 'סבבים')}${mid}${tab('board', '🏆 מובילים')}</div></nav>`;
}
const openDetails = new Set();
app.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && d.dataset.k) { d.open ? openDetails.add(d.dataset.k) : openDetails.delete(d.dataset.k) } }, true);
function render() {
  pending = false;
  if (fatal) { app.innerHTML = `<div class="empty">${LOGO('big')}<div class="display" style="margin-top:14px">PeakTheVibe</div><p class="muted">${esc(fatal)}</p></div>`; return }
  const L = S.loaded;
  if (!ready || !L.players || !L.rounds || !L.topics || !L.admin || !L.settings || !L.link) { app.innerHTML = '<p class="muted" style="padding-top:40px;text-align:center">טוען…</p>'; return }
  if (myLink && myLink.status === 'pending') { app.innerHTML = waitView(); return }
  if (!S.players[me]) { app.innerHTML = view.name === 'restore' ? restoreView() : nickView(); return }
  if (!S.players[me].fullName) { app.innerHTML = nickView(); return }
  let body = '', rateBar = false;
  const v = view.name;
  if (v === 'round') { const r = S.rounds.find(x => x.id === view.v); if (r) { body = roundView(r); rateBar = body.includes('class="savebar"') } else body = homeView() }
  else if (v === 'new' && isAdmin()) body = newView();
  else if (v === 'admin' && isAdmin()) body = adminView();
  else if (v === 'suggest') body = suggestView();
  else if (v === 'help') body = helpView();
  else if (v === 'feedback') body = feedbackView();
  else if (v === 'inbox' && isAdmin()) body = inboxView();
  else if (v === 'history' && isAdmin()) body = historyView();
  else if (v === 'board') body = boardView();
  else if (v === 'profile') body = profileView(view.v);
  else body = homeView();
  const y = window.scrollY || 0;
  app.innerHTML = body + FOOT() + (rateBar ? '' : nav());
  if (view.name === 'home') maybeWeekly();
  app.querySelectorAll('details[data-k]').forEach(d => { if (openDetails.has(d.dataset.k)) d.open = true });
  if (window.scrollY !== y) window.scrollTo(0, y);
}
const LOGO = (cls) => `<span class="logo ${cls || ''}"><img src="PeakTheVibeLogo.png" alt=""></span>`;
const FOOT = () => `<footer class="foot">${S.players[me] ? '<button class="fblink" data-act="go" data-v="feedback">משהו לא עובד? יש לך רעיון? 💬 שלחו משוב</button>' : ''}© ${new Date().getFullYear()} PeakTheVibe. כל הזכויות שמורות לאופק טלקר.<span class="ver">גרסה ${APP_LABEL}</span></footer>`;
function helpSeen() { try { return localStorage.getItem('ptv_help') === '1' } catch (_) { return true } }
function markHelp() { try { localStorage.setItem('ptv_help', '1') } catch (_) { } }
function helpView() {
  const st = S.settings;
  const item = (ic, t, d) => `<div class="hitem"><span class="hic">${ic}</span><div><b>${t}</b><p>${d}</p></div></div>`;
  return `<div style="text-align:center;padding-top:8px">${LOGO('big')}</div>
  <div class="display" style="font-size:52px;margin:14px 0 6px;text-align:center">איך משחקים</div>
  <p class="muted" style="text-align:center;margin:0 0 18px">דקה של קריאה, ואתם בפנים.</p>
  ${item('🎵', 'כל יום נושא חדש', `הנושא נפתח כל יום ב-${hh(st.startHour)}. יש ${st.pickHours} שעות לבחור שיר שמתאים לו.`)}
  ${item('✏️', 'בוחרים שיר', 'כותבים שם שיר ואמן. לינק מספוטיפיי, אפל מיוזיק או יוטיוב לא חובה, אבל עוזר לכולם לשמוע.')}
  ${item('🔒', 'שומרים או נועלים', '"שמור" שומר טיוטה שאפשר לשנות כמה שרוצים. "נעל" זה סופי. שכחתם לנעול? הטיוטה נספרת בסוף הזמן.')}
  ${item('⭐', 'מדרגים', `אחרי זמן הבחירה יש ${st.rateHours} שעות לדרג. השירים מוצגים בלי שמות, וכל שיר מקבל ציון מ-1 עד 10 (גוררים את המחוון) בשני מדדים: 🎯 כמה מתאים לנושא, ו-✨ מדד שני שמשתנה בכל נושא. את השיר שלכם לא מדרגים.`)}
  <div class="hitem warn">${'<span class="hic">⚠️</span>'}<div><b>החוק הכי חשוב</b><p>בחרתם שיר? חייבים לדרג את כל השירים האחרים. אחרת השיר שלכם מקבל 0 בסבב.</p></div></div>
  ${item('🕵️', 'מנחשים מי בחר', 'ליד כל שיר בוחרים מי לדעתכם בחר אותו. כל ניחוש נכון שווה נקודת בונוס.')}
  ${item('🎰', 'מהמרים על המנצח', 'בשלב הדירוג אפשר לסמן שיר אחד שלדעתכם ייקח את המקום הראשון (לא את שלכם). צדקתם? עוד נקודת בונוס.')}
  ${item('📅', 'סיכום שבועי', 'כל יום ראשון נפתח סיכום של השבוע שעבר: המובילים, השיר של השבוע וה-Flop. אפשר לצפות בו שוב במסך 🏆 מובילים.')}
  ${item('🏆', 'ניקוד ותארים', 'כל שיר מקבל את הממוצע של שני המדדים מכל המדרגים, עד 10 נקודות, ועוד בונוסים מניחושים. בלשונית 🏆 מובילים יש לוח שבועי (מיום ראשון), לוח של כל הזמנים, תארים מצחיקים ופרופיל לכל שחקן.')}
  ${item('💡', 'יש לכם רעיון לנושא?', 'כפתור "הצע נושא" בתחתית המסך. אפשר להציע משפט, או תמונה שכולם יבחרו לה שיר. אם המנהל יאשר, הוא יעלה באחד הימים, בלי שאף אחד יידע שזה שלכם.')}
  ${item('💬', 'משהו לא עובד?', 'בתחתית כל מסך יש "שלחו משוב". כתבו מה קרה או מה הייתם רוצים, וזה מגיע ישר למנהל.')}
  ${item('📱', 'טיפ חשוב', 'הוסיפו את המשחק למסך הבית ופתחו אותו תמיד משם, כי המשחק מזהה אתכם לפי הדפדפן. כדאי לגבות עם Google בפרופיל שלכם: ככה תוכלו להתחבר מכל מכשיר. לא גיביתם והחלפתם טלפון? במסך הכניסה בחרו "שחזר את החשבון שלי", והמנהל יאשר.')}
  <button class="btn block" style="margin-top:18px" data-act="helpdone">הבנתי, יאללה</button>`;
}
function nickView() {
  const ex = S.players[me];
  const d = draft('nick', () => ({ v: ex ? ex.nick : '', full: '' }));
  if (ex) return `<div style="padding-top:24px;text-align:center">${LOGO('big')}<div class="display" style="font-size:52px;margin:14px 0 10px">עוד פרט אחד</div></div>
  <div class="panel"><p style="margin-top:0">היי ${esc(ex.nick)}, הוספנו שדה של שם מלא. הוא יוצג בקטן רק בפרופיל שלך.</p>
  <label class="f" for="full">שם מלא</label><input id="full" class="field" data-f="nick.full" maxlength="40" value="${esc(d.full)}" placeholder="שם פרטי ושם משפחה">
  <button class="btn block" data-act="savefull">שמור</button></div>${FOOT()}`;
  return `<div style="padding-top:24px;text-align:center">${LOGO('big')}<div class="display" style="font-size:min(64px,16vw);margin:14px 0 10px">PeakTheVibe</div></div><div>
  <p>כל יום נושא חדש. בוחרים שיר שמתאים, מדרגים את השירים של כולם, מנחשים מי בחר מה, ומי שבחר הכי טוב לוקח.</p>
  <div class="panel" style="margin-top:22px"><label class="f" for="nick">איך יקראו לך במשחק?</label>
  <input id="nick" class="field" data-f="nick.v" maxlength="24" value="${esc(d.v)}" placeholder="למשל: נגה">
  <p class="hint">הכינוי מוצג לכל המשתתפים במשחק.</p>
  <label class="f" for="full">שם מלא</label><input id="full" class="field" data-f="nick.full" maxlength="40" value="${esc(d.full)}" placeholder="שם פרטי ושם משפחה">
  <p class="hint">מוצג בקטן רק בפרופיל שלך.</p>
  <button class="btn block" data-act="savenick">יאללה, נכנסים</button></div>
  <div class="panel restorebox"><b>כבר שיחקת במכשיר אחר?</b><p class="hint" style="margin:4px 0 10px">גיביתם עם Google? התחברו ישר. לא גיביתם? בחרו את השם שלכם והמנהל יאשר.</p>
  <button class="btn ghost block" data-act="go" data-v="restore">שחזר את החשבון שלי</button>
  <button class="btn ghost block" style="margin-top:8px" data-act="glogin">🔐 כבר גיביתי? התחברות עם Google</button></div></div>${FOOT()}`;
}
function topicImgHtml(r, cls) {
  if (!r || !r.img) return '';
  const d = getImg(r.img);
  return `<span class="timg ${cls || ''}" data-img="${esc(r.img)}">${d ? `<img src="${d}" alt="תמונת הנושא">` : d === null ? '<span class="muted">טוען תמונה…</span>' : ''}</span>`;
}
/* Admin: attach a picture to a topic. d.imgData = newly chosen (not uploaded yet), d.img = id of a saved one. */
function imgPicker(key) {
  const d = D[key] || {}, has = !!(d.imgData || d.img), data = d.imgData || (d.img ? getImg(d.img) : '');
  const file = `<input type="file" accept="image/*" data-timg="${esc(key)}" hidden>`;
  return `<label class="f" style="margin-top:${key === 'sg' ? 0 : 14}px">תמונה לנושא</label>` + (has
    ? `<span class="timg sm" ${d.img && !d.imgData ? `data-img="${esc(d.img)}"` : ''}>${data ? `<img src="${data}" alt="">` : '<span class="muted">טוען תמונה…</span>'}</span>
       <div class="row-actions" style="margin-top:0"><label class="btn ghost sm">החלף תמונה${file}</label><button class="btn ghost sm" data-act="rmtimg" data-k="${esc(key)}">הסר תמונה</button></div>`
    : `<label class="btn ghost block">🖼️ העלה תמונה${file}</label><p class="hint" style="margin:6px 0 0">השחקנים יבחרו שיר שמתאים לתמונה. עם תמונה אפשר להשאיר את שדה הנושא ריק, או לכתוב בו כיתוב קצר.</p>`);
}
function langPicker(key) {
  const cur = (D[key] && D[key].lang) || 'any';
  return `<label class="f" style="margin-top:14px">שפת השיר בסבב</label><div class="seg" style="margin-bottom:6px">${Object.entries(LANGS).map(([k, v]) => `<button class="${cur === k ? 'on' : ''}" data-act="lang" data-k="${esc(key)}" data-v="${k}">${v.ic} ${v.l}</button>`).join('')}</div>`;
}
function langBanner(r) {
  const k = langOf(r); if (k === 'any') return '';
  return `<div class="langban ${k}"><span>${LANGS[k].ic}</span><b>${k === 'he' ? 'שיר בעברית בלבד' : 'שיר באנגלית בלבד'}</b></div>`;
}
/* ---------- song components ---------- */
function artHtml(p, cls) {
  const u = safeUrl(p && p.artwork);
  if (u) return `<span class="art ${cls || ''}"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  const hue = hash(((p && p.title) || '') + ((p && p.artist) || '')) % 360;
  return `<span class="art ph ${cls || ''}" style="--h:${hue}"><span>♪</span></span>`;
}
function playBtn(p) {
  const pv = safeUrl(p.previewUrl);
  if (pv) { const st = previewLoading === pv ? 'load' : previewPlaying === pv ? 'on' : '';
    return `<button class="play ${st}" data-act="preview" data-v="${esc(pv)}" data-tid="${esc(p.trackId || '')}" aria-label="נגן קטע">${st === 'load' ? '…' : st === 'on' ? '❚❚' : '▶'}</button>` }
  const u = safeUrl(p.url) || 'https://www.youtube.com/results?search_query=' + encodeURIComponent((p.title + ' ' + (p.artist || '')).trim());
  return `<a class="play" href="${esc(u)}" target="_blank" rel="noopener" aria-label="פתח את השיר">▶</a>`;
}
function openLinks(p) { return `<div class="olinks">${songLinkList(p)}</div>` }
/* A music card. It never shows who picked the song; callers add that only after rating ends. */
function songCard(p, o) {
  o = o || {};
  const hue = hash((p.title || '') + (p.artist || '')) % 360;
  return `<div class="scard ${o.compact ? 'compact' : ''} ${o.self ? 'self' : ''}" style="--h:${hue}">
    <div class="shead">${artHtml(p)}<div class="sinfo"><div class="t">${esc(p.title)}</div><div class="a">${esc(p.artist || '')}</div>${o.tag ? `<div class="stag">${o.tag}</div>` : ''}</div>${o.noPlay ? '' : playBtn(p)}</div>
    ${o.links === false ? '' : openLinks(p)}${o.body || ''}</div>`;
}
function searchResultsHtml(k) {
  const st = searchState[k] || {};
  const spin = st.loading ? `<p class="sstatus">מחפש…</p>` : '';
  if (st.error) return `<p class="sstatus">${esc(st.error)}${st.code ? `<span class="scode">קוד: ${esc(st.code)}</span>` : ''}</p>`;
  if (!st.results || !st.results.length) return spin;
  return spin + `<div class="sresults ${st.loading ? 'dim' : ''}">${st.results.map((x, i) => `<button class="sres" data-act="pickres" data-k="${esc(k)}" data-i="${i}">${artHtml(x, 'sm')}<span class="sinfo"><span class="t">${esc(x.title)}</span><span class="a">${esc(x.artist)}${x.album ? ' · ' + esc(x.album) : ''}</span></span><span class="src">${x.source === 'deezer' ? 'Deezer' : 'Apple Music'}</span></button>`).join('')}</div>`;
}
function pickFormHtml(r, mine, k, d) {
  const langHint = langOf(r) !== 'any' ? `<p class="hint" style="margin:0 0 10px;color:var(--ink)">${LANGS[langOf(r)].ic} זכרו: ${langOf(r) === 'he' ? 'שיר בעברית' : 'שיר באנגלית'} בלבד בסבב הזה.</p>` : '';
  const chosen = d.title ? `<div class="chosen"><small>${mine ? 'טיוטה שמורה' : 'השיר שבחרת (עוד לא נשמר)'}</small>${songCard(d, { compact: true, links: false })}${mine ? '<p class="hint" style="margin:6px 0 0">אפשר לשנות עד שנועלים. טיוטה שלא ננעלה נספרת בסוף הזמן.</p>' : ''}</div>` : '';
  return `<div class="panel">${langHint}${chosen}
    <label class="f" for="sq">חיפוש שיר</label>
    <div class="sbar"><span class="sicon" aria-hidden="true">🔍</span><input id="sq" class="field" data-f="${k}.q" data-search="${esc(k)}" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(d.q || '')}" placeholder="התחילו להקליד שם של שיר או אמן"></div>
    <div data-sr="${esc(k)}">${searchResultsHtml(k)}</div>
    <details data-k="manual-${esc(r.id)}" class="manual"><summary>לא מצאתם? הוספה ידנית</summary>
      <label class="f" for="pt" style="margin-top:12px">שם השיר</label><input id="pt" class="field" data-f="${k}.title" maxlength="80" value="${esc(d.title)}">
      <label class="f" for="pa">אמן</label><input id="pa" class="field" data-f="${k}.artist" maxlength="60" value="${esc(d.artist)}">
      <label class="f" for="pu">לינק (לא חובה)</label><input id="pu" class="field" data-f="${k}.url" inputmode="url" dir="ltr" value="${esc(d.url)}" placeholder="Spotify / Apple Music / YouTube">
    </details>
    <div class="row-actions"><button class="btn ghost" style="flex:1" data-act="savepick" ${busy ? 'disabled' : ''}>שמור</button><button class="btn" style="flex:1" data-act="lockpick" ${busy ? 'disabled' : ''}>נעל בחירה 🔒</button></div></div>`;
}
function restoreView() {
  const list = Object.entries(S.players).filter(([u]) => u !== S.admin && u !== authUid).sort((a, b) => (a[1].nick || '').localeCompare(b[1].nick || '', 'he'));
  return `<button class="back" data-act="go" data-v="home">→ חזרה</button>
  <div class="display" style="font-size:48px;margin:4px 0 6px">שחזור חשבון</div>
  <p class="hint" style="margin:0 0 14px">בחרו את השם שלכם. המנהל יקבל בקשה, וברגע שיאשר, החשבון ייפתח כאן עם כל ההיסטוריה.</p>
  ${list.length ? list.map(([u, p]) => `<button class="qrow pickme" data-act="reqrestore" data-v="${esc(u)}"><span class="qt">${esc(p.nick)}<small>${esc(p.fullName || '')}</small></span><span class="muted">בחר ←</span></button>`).join('') : '<p class="muted">עוד אין שחקנים לשחזר.</p>'}
  <p class="hint" style="margin-top:14px">מי שגיבה עם Google יכול פשוט להתחבר במסך הכניסה, בלי בקשה.</p>${FOOT()}`;
}
function waitView() {
  const p = S.players[myLink.target] || {};
  return `<div style="padding-top:24px;text-align:center">${LOGO('big')}<div class="display" style="font-size:52px;margin:14px 0 6px">⏳ מחכים למנהל</div></div>
  <div class="panel"><p style="margin-top:0">ביקשת לשחזר את החשבון של <b>${esc(p.nick || 'שחקן')}</b>.</p>
  <p class="hint" style="margin:0 0 14px">המנהל צריך לאשר שזה באמת את/ה. אפשר לשלוח לו הודעה. ברגע שיאשר, החשבון ייפתח כאן לבד.</p>
  <button class="btn ghost block" data-act="cancelrestore">ביטול הבקשה</button></div>${FOOT()}`;
}
function diagAdminHtml() {
  const rows = Object.entries(S.players).filter(([, p]) => p.diag).sort((a, b) => (b[1].diag.at || 0) - (a[1].diag.at || 0));
  if (!rows.length) return `<details data-k="diag" class="panel" style="margin-top:10px"><summary><b>🩺 אבחון חיפוש</b></summary><p class="hint" style="margin:8px 0 0">עוד אין נתונים. הנתונים נאספים כששחקן מחפש שיר בפעם הראשונה בגרסה הזו.</p></details>`;
  const st = v => !v ? '<span class="muted">לא נוסה</span>' : v === 'ok' ? '<b class="dok">✓ עובד</b>' : `<b class="dbad">✗ חסום</b> <span class="dcode">${esc(v)}</span>`;
  return `<details data-k="diag" class="panel" style="margin-top:10px"><summary><b>🩺 אבחון חיפוש (${rows.length})</b></summary><div style="margin-top:8px">${rows.map(([u, p]) => `<div class="logrow"><b>${esc(p.nick)}</b> <span class="muted" style="font-size:13px">${esc(p.diag.device || '')}, גרסה ${esc(p.diag.ver || '?')}</span><div style="font-size:13px">Apple: ${st(p.diag.itunes)}</div><div style="font-size:13px">Deezer: ${st(p.diag.deezer)}</div></div>`).join('')}</div></details>`;
}
function identityAdminHtml() {
  const pend = (S.links || []).filter(l => l.status === 'pending').sort((a, b) => (a.at || 0) - (b.at || 0));
  const appr = (S.links || []).filter(l => l.status === 'approved');
  let h = authGoogle
    ? `<div class="panel idok">🔐 <b>החשבון שלך מגובה עם Google</b><small>${esc(authGoogle.email || '')}. אפשר להתחבר מכל מכשיר: "כבר גיביתי? התחברות עם Google" במסך הכניסה.</small></div>`
    : `<div class="panel idwarn"><b>⚠️ החשבון שלך לא מגובה</b><small>אם תחליף מכשיר או תמחק היסטוריה, תאבד את הניהול ואת הניקוד. גיבוי עם Google מאפשר גם להתחבר מהמחשב ומהטלפון יחד.</small><button class="btn block" style="margin-top:10px" data-act="gbackup">🔐 גבה עם Google</button></div>`;
  if (pend.length) h += `<h2>📲 בקשות שחזור (${pend.length})</h2>` + pend.map(l => { const p = S.players[l.target] || {};
    return `<div class="panel" style="margin-bottom:10px"><b>מכשיר חדש מבקש להיות ${esc(p.nick || '?')}</b><small class="muted" style="display:block">${esc(p.fullName || '')}${l.at ? ', ' + new Date(l.at).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</small>
    <p class="hint" style="margin:6px 0 0">לא בטוח? תשאל אותו/ה בוואטסאפ לפני שמאשרים.</p>
    <div class="row-actions"><button class="btn" style="flex:1" data-act="approvelink" data-v="${esc(l.id)}">אשר</button><button class="btn ghost" style="flex:1" data-act="rejectlink" data-v="${esc(l.id)}">דחה</button></div></div>` }).join('');
  if (appr.length) h += `<details data-k="links-ok" class="panel" style="margin-top:10px"><summary><b>מכשירים ששוחזרו (${appr.length})</b></summary><div style="margin-top:8px">${appr.map(l => `<div class="qrow" style="background:var(--bg)"><div class="qt">${esc(nameOf(l.target))}<small>אושר ${l.approvedAt ? fmtDate(l.approvedAt) : ''}</small></div><button class="btn ghost" style="min-height:36px;padding:4px 12px;font-size:13px" data-act="rejectlink" data-v="${esc(l.id)}">בטל</button></div>`).join('')}</div></details>`;
  return h;
}
/* ---------- avatars ---------- */
function avatarHtml(uid, cls) {
  const p = S.players[uid] || {}, ph = safePhoto(p.photo);
  if (ph) return `<span class="av ${cls || ''}"><img src="${ph}" alt=""></span>`;
  const n = (p.nick || '?').trim(), hue = hash(uid || n) % 360;
  return `<span class="av ini ${cls || ''}" style="--h:${hue}">${esc(Array.from(n)[0] || '?')}</span>`;
}
const withAv = (uid, cls) => `<span class="withav">${avatarHtml(uid, cls)}<span>${esc(nameOf(uid))}</span></span>`;
/* ---------- feedback / tickets ---------- */
const FB_TYPES = { bug: '🐞 תקלה', idea: '💡 רעיון', other: '💬 אחר' };
const fbWhen = t => new Date(t).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
function feedbackView() {
  ensureMyFeedbackSub();
  const d = draft('fb', () => ({ type: 'bug', t: '' }));
  const mine = (S.myFeedback || []).slice().sort((a, b) => b.at - a.at);
  let h = `<button class="back" data-act="go" data-v="home">→ חזרה</button>
  <div class="display" style="font-size:48px;margin:4px 0 6px">משוב</div>
  <p class="hint" style="margin:0 0 14px">משהו לא עובד, או שיש לכם רעיון? כתבו כאן, וזה יגיע ישר למנהל. הכינוי, הגרסה וסוג המכשיר מצורפים אוטומטית, כדי שיהיה קל להבין מה קרה.</p>
  <div class="panel"><div class="seg" style="margin-bottom:12px">${Object.entries(FB_TYPES).map(([k, l]) => `<button class="${d.type === k ? 'on' : ''}" data-act="fbtype" data-v="${k}">${l}</button>`).join('')}</div>
  <textarea class="field" data-f="fb.t" maxlength="1500" style="min-height:120px" placeholder="${d.type === 'bug' ? 'מה קרה? באיזה מסך? מה ציפיתם שיקרה?' : d.type === 'idea' ? 'מה הייתם רוצים להוסיף או לשנות?' : 'כתבו כאן'}">${esc(d.t)}</textarea>
  <button class="btn block" data-act="sendfb" ${busy ? 'disabled' : ''}>שלח</button></div>`;
  if (mine.length) h += `<h2>מה ששלחתם</h2>` + mine.map(f => `<div class="panel fbitem"><div class="fbhead"><span>${FB_TYPES[f.type] || ''}</span><span class="pill ${f.status === 'done' ? 'rate' : ''}">${f.status === 'done' ? '✓ טופל' : 'נשלח'}</span></div>
    <div class="fbtext">${esc(f.text)}</div><small class="muted">${fbWhen(f.at)}</small>
    ${f.reply ? `<div class="fbreply"><b>תשובה מ${esc(nameOf(S.admin))}:</b> ${esc(f.reply)}</div>` : ''}</div>`).join('');
  return h;
}
function inboxView() {
  const L = (S.feedback || []).slice().sort((a, b) => ((b.status === 'new') - (a.status === 'new')) || (b.at - a.at)); // new first, then newest
  let h = `<button class="back" data-act="go" data-v="admin">→ ניהול</button>
  <div class="display" style="font-size:48px;margin:4px 0 6px">משוב ותקלות</div>
  <p class="hint" style="margin:0 0 14px">רק אתה רואה את זה. השחקן רואה את הסטטוס ואת התשובה שלך במסך המשוב שלו.</p>`;
  if (!L.length) return h + `<p class="muted">עוד לא התקבל משוב.</p>`;
  h += L.map(f => { const k = 'fbr:' + f.id; const d = D[k];
    return `<div class="panel fbitem ${f.status === 'new' ? 'fbnew' : ''}">
    <div class="fbhead"><span class="withav">${avatarHtml(f.by, 'xs')}<b>${esc(f.nick || nameOf(f.by))}</b></span><span>${FB_TYPES[f.type] || ''}</span></div>
    <div class="fbtext">${esc(f.text)}</div>
    <small class="muted">${fbWhen(f.at)} · גרסה ${esc(f.ver || '?')} · ${esc(f.device || '')}</small>
    ${f.reply ? `<div class="fbreply"><b>התשובה שלך:</b> ${esc(f.reply)}</div>` : ''}
    ${d ? `<textarea class="field" data-f="${k}.t" maxlength="800" style="margin-top:10px" placeholder="התשובה תופיע לשחקן במסך המשוב">${esc(d.t)}</textarea>
      <div class="row-actions" style="margin-top:0"><button class="btn" style="flex:1" data-act="fbreply" data-v="${esc(f.id)}">שלח תשובה</button><button class="btn ghost" style="flex:1" data-act="fbreplycancel" data-v="${esc(f.id)}">ביטול</button></div>`
    : `<div class="row-actions"><button class="btn ghost sm" data-act="fbreplyopen" data-v="${esc(f.id)}">${f.reply ? 'ערוך תשובה' : 'השב'}</button><button class="btn ghost sm" data-act="fbdone" data-v="${esc(f.id)}">${f.status === 'done' ? 'החזר לחדש' : '✓ טופל'}</button><button class="btn ghost sm danger" data-act="fbdel" data-v="${esc(f.id)}">מחק</button></div>`}
    </div>` }).join('');
  return h;
}
function metricPicker(key) {
  const d = D[key];
  return `<label class="f">המדד השני (הראשון תמיד: התאמה לנושא)</label>
  <input class="field" data-f="${key}.m" maxlength="50" value="${esc(d.m)}">
  <div class="chips">${METRICS.map((x, i) => `<button class="${d.m === x.m ? 'on' : ''}" data-act="metric" data-k="${esc(key)}" data-i="${i}">${esc(x.m)}</button>`).join('')}</div>
  <label class="check"><input type="checkbox" data-f="${key}.f" ${d.f ? 'checked' : ''}> מדד הומור (נספר לתואר Comedian ולממוצע המצחיק)</label>`;
}
function homeView() {
  // rounds that still need something from me first, then by nearest deadline
  const needsMe = r => {
    const ph = phase(r), mp = S.picks.find(p => p.rid === r.id && p.uid === me), mr = S.ratings.find(x => x.rid === r.id && x.uid === me);
    if (ph === 'pick') return !mp || !mp.locked;
    return S.picks.some(p => p.rid === r.id && p.uid !== me) && (!mr || !mr.locked);
  };
  const deadline = r => phase(r) === 'pick' ? r.pickEnds : r.rateEnds;
  const open = S.rounds.filter(r => phase(r) !== 'done').sort((a, b) => (needsMe(b) - needsMe(a)) || (deadline(a) - deadline(b)));
  const done = doneRounds().sort((a, b) => b.rateEnds - a.rateEnds);
  let head = `<div class="brand"><span class="bright"><button class="meav" data-act="prof" data-v="${esc(me)}" aria-label="הפרופיל שלי">${avatarHtml(me, 'sm')}<span>${esc(nameOf(me))}</span></button><button class="qbtn" data-act="go" data-v="help" aria-label="איך משחקים">?</button></span><span class="bname"><span class="display">PeakTheVibe</span>${LOGO()}</span></div>`;
  if (wantAdmin && !S.admin) head += `<div class="banner">עוד אין מנהל למשחק. <button class="btn" style="min-height:40px;margin-top:8px" data-act="claim">הפוך אותי למנהל</button></div>`;
  const nt = nextAutoTime();
  const nextLine = `<p class="hint" style="margin:0 0 6px">הנושא הבא נפתח ${new Date(nt).toDateString() === new Date().toDateString() ? 'היום' : 'מחר'} ב-${hh(S.settings.startHour)}.</p>`;
  if (!S.rounds.length) return head + `<div class="empty"><div class="display">עוד אין נושא</div><p class="muted">הסבב הראשון ייפתח לבד ב-${hh(S.settings.startHour)}.</p></div>`;
  const row = r => {
    const ph = phase(r), picks = S.picks.filter(p => p.rid === r.id);
    const myPick = picks.find(p => p.uid === me), myRate = S.ratings.find(x => x.rid === r.id && x.uid === me);
    let c, time, cta, ctaCls = '';
    if (ph === 'pick') {
      c = 'var(--pink)'; time = `נותרו <span data-ends="${r.pickEnds}">${fmtLeft(r.pickEnds - now())}</span> לבחירה`;
      if (!myPick) cta = 'לבחירה ←';
      else if (!myPick.locked) cta = '✏️ ערוך בחירה';
      else { cta = '✓ נעלת'; ctaCls = 'done' }
    } else if (ph === 'rate') {
      c = 'var(--mint)'; time = `נותרו <span data-ends="${r.rateEnds}">${fmtLeft(r.rateEnds - now())}</span> לדירוג`;
      const toRate = picks.filter(p => p.uid !== me).length;
      if (!toRate) { cta = 'לצפייה ←'; ctaCls = 'soft' }
      else if (!myRate) cta = 'לדירוג ←';
      else if (!myRate.locked) cta = '✏️ המשך דירוג';
      else { cta = '✓ דירגת'; ctaCls = 'done' }
    } else {
      const w = roundData(r).rows[0]; c = 'var(--line)';
      time = (w && w.pts > 0 ? '🏆 ' + esc(nameOf(w.uid)) + ', ' : '') + fmtDate(r.rateEnds);
      const fresh = !revealSeen(r.id);
      cta = fresh ? 'לתוצאות ←' : 'תוצאות'; ctaCls = fresh ? '' : 'soft';
    }
    const cnt = isAdmin() && ph !== 'done' ? `<span class="adm">${roundStatus(r).short}</span>` : '';
    const lang = langOf(r) !== 'any' ? `<span class="langtag ${langOf(r)}">${LANGS[langOf(r)].ic} ${langOf(r) === 'he' ? 'עברית בלבד' : 'אנגלית בלבד'}</span>` : '';
    return `<button class="round rcard" style="--c:${c}" data-act="open" data-v="${esc(r.id)}">
      <span class="rinfo">${topicImgHtml(r, 'thumb')}<span class="display">${esc(r.topic)}</span>${lang}<span class="rmeta">${picks.length === 1 ? 'שיר אחד' : picks.length + ' שירים'}${cnt ? ' · ' + cnt : ''}</span><span class="rmeta">${time}</span></span>
      <span class="cta ${ctaCls}">${cta}</span></button>`;
  };
  const unseen = done.filter(r => !revealSeen(r.id) && now() - r.rateEnds < 7 * 864e5).length;
  const tabs = `<div class="seg htabs"><button class="${homeTab === 'open' ? 'on' : ''}" data-act="htab" data-v="open">פתוחים עכשיו${open.length ? ` <span class="badge-n neutral">${open.length}</span>` : ''}</button><button class="${homeTab === 'done' ? 'on' : ''}" data-act="htab" data-v="done">הסתיימו${unseen ? ` <span class="badge-n">${unseen}</span>` : ''}</button></div>`;
  const body = homeTab === 'done'
    ? (done.length ? done.map(row).join('') : `<p class="muted" style="text-align:center;padding:24px 0">עוד אין סבבים שהסתיימו.</p>`)
    : (open.length ? open.map(row).join('') : `<p class="muted" style="text-align:center;padding:24px 0">אין סבבים פתוחים כרגע.${unseen ? ' יש תוצאות חדשות בלשונית "הסתיימו".' : ''}</p>`);
  return head + nextLine + tabs + body;
}
function hoursOpt(sel) { return [6, 12, 24, 48].map(h => `<option value="${h}" ${h == sel ? 'selected' : ''}>${h} שעות</option>`).join('') }
function newView() {
  const d = draft('new', () => ({ t: '', m: DEFAULT_M.m, f: true, ph: S.settings.pickHours, rh: S.settings.rateHours }));
  return `<button class="back" data-act="go" data-v="admin">→ ניהול</button>
  <div class="display" style="font-size:48px;margin:4px 0 6px">סבב מיידי</div>
  <p class="hint" style="margin:0 0 14px">נפתח עכשיו, בנוסף לסבב היומי האוטומטי.</p>
  <div class="panel">
  <label class="f" for="topic">הנושא</label>
  <textarea id="topic" class="field" data-f="new.t" maxlength="90">${esc(d.t)}</textarea>
  ${ideaChips('new')}
  ${imgPicker('new')}${metricPicker('new')}${langPicker('new')}
  <div class="two" style="margin-top:14px"><div><label class="f">זמן לבחירה</label><select class="field" data-f="new.ph">${hoursOpt(d.ph)}</select></div>
  <div><label class="f">זמן לדירוג</label><select class="field" data-f="new.rh">${hoursOpt(d.rh)}</select></div></div>
  <button class="btn block" data-act="create" ${busy ? 'disabled' : ''}>פתח את הסבב עכשיו</button></div>`;
}
function suggestView() {
  const d = draft('sg', () => ({ kind: 'text', t: '', m: DEFAULT_M.m, f: true }));
  const isImg = d.kind === 'img';
  const mine = S.topics.filter(t => t.by === me).sort((a, b) => b.createdAt - a.createdAt);
  const st = { pending: 'ממתין לאישור', approved: 'אושר, בתור', used: 'עלה לאוויר', rejected: 'לא אושר' };
  return `<div class="display" style="font-size:48px;margin:4px 0 6px">הצע נושא</div>
  <p class="hint" style="margin:0 0 14px">מציעים משפט או תמונה. ההצעה נשלחת למנהל, ואם תאושר היא תיכנס לתור ותעלה באחד הימים, בלי שיופיע מי הציע.</p>
  <div class="panel"><div class="seg" style="margin-bottom:14px"><button class="${isImg ? '' : 'on'}" data-act="sgkind" data-v="text">✏️ משפט</button><button class="${isImg ? 'on' : ''}" data-act="sgkind" data-v="img">🖼️ תמונה</button></div>
  ${isImg
    ? `${imgPicker('sg')}<label class="f" for="sgt" style="margin-top:14px">כיתוב (לא חובה)</label><input id="sgt" class="field" data-f="sg.t" maxlength="90" value="${esc(d.t)}" placeholder="למשל: שיר שמתאים לתמונה הזו">`
    : `<label class="f" for="sgt">הנושא</label>
  <textarea id="sgt" class="field" data-f="sg.t" maxlength="90" placeholder="שיר שמתאים לבוס האחרון במשחק">${esc(d.t)}</textarea>
  ${ideaChips('sg')}`}
  ${metricPicker('sg')}
  <button class="btn block" style="margin-top:14px" data-act="submittopic" ${busy ? 'disabled' : ''}>שלח למנהל</button></div>
  ${mine.length ? `<h2>הנושאים ששלחת</h2>` + mine.map(t => `<div class="qrow"><div class="qt">${t.img ? '🖼️ ' : ''}${esc(t.text)}</div><span class="pill ${t.status === 'used' ? 'rate' : ''}">${st[t.status] || ''}</span></div>`).join('') : ''}`;
}
function adminView() {
  const P = pendingTopics(), Q = queue();
  const s = draft('set', () => ({ sh: S.settings.startHour, ph: S.settings.pickHours, rh: S.settings.rateHours }));
  const first = nextAutoTime();
  let h = `<div class="display" style="font-size:48px;margin:4px 0 14px">ניהול</div>
  <button class="btn ghost block" data-act="go" data-v="history" style="margin-bottom:6px">📜 היסטוריית תוצאות (${Object.keys(S.logs || {}).length})</button>` + identityAdminHtml() + diagAdminHtml() + (() => { const n = (S.feedback || []).filter(f => f.status === 'new').length; return `<button class="btn ${n ? '' : 'ghost'} block" data-act="go" data-v="inbox" style="margin-top:10px">💬 משוב ותקלות${n ? ` (${n} חדשים)` : ` (${(S.feedback || []).length})`}</button>` })();
  h += `<h2>ממתינים לאישור (${P.length})</h2>`;
  h += P.length ? P.map(t => {
    const k = 'ed:' + t.id; draft(k, () => ({ t: t.text, m: t.metric2 || DEFAULT_M.m, f: t.funny !== false, lang: t.lang || 'any', img: t.img || '' }));
    return `<div class="panel" style="margin-bottom:10px"><p class="hint" style="margin:0 0 6px">נשלח ע״י ${esc(nameOf(t.by))}</p>
    <textarea class="field" data-f="${k}.t" maxlength="90">${esc(D[k].t)}</textarea>${imgPicker(k)}${metricPicker(k)}${langPicker(k)}
    <div class="row-actions"><button class="btn" data-act="approve" data-v="${esc(t.id)}">אשר והכנס לתור</button><button class="btn ghost" data-act="reject" data-v="${esc(t.id)}">דחה</button></div></div>`;
  }).join('') : `<p class="muted">אין נושאים שממתינים.</p>`;
  h += `<h2>התור (${Q.length})</h2>`;
  h += Q.length ? Q.map((t, i) => {
    const d = new Date(first); d.setDate(d.getDate() + i);
    return `<div class="qrow"><div class="qt">${t.img ? '🖼️ ' : ''}${esc(t.text)}<small>${fmtDate(d.getTime())} · ${esc(t.metric2 || DEFAULT_M.m)}${langOf(t) !== 'any' ? ' · ' + LANGS[langOf(t)].ic + ' ' + LANGS[langOf(t)].l : ''}</small></div>
    <span class="qbtns"><button data-act="qmove" data-v="${esc(t.id)}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="למעלה">▲</button><button data-act="qmove" data-v="${esc(t.id)}" data-d="1" ${i === Q.length - 1 ? 'disabled' : ''} aria-label="למטה">▼</button><button data-act="qdel" data-v="${esc(t.id)}" aria-label="מחק">✕</button></span></div>`;
  }).join('') : `<p class="muted">התור ריק. כשאין נושא בתור, נבחר נושא מהמאגר המובנה.</p>`;
  draft('add', () => ({ t: '', m: DEFAULT_M.m, f: true }));
  h += `<details data-k="addq" class="panel" style="margin-top:10px"><summary><b>הוסף נושא ישר לתור</b></summary><div style="margin-top:12px">
  <textarea class="field" data-f="add.t" maxlength="90">${esc(D.add.t)}</textarea>${ideaChips('add')}${imgPicker('add')}${metricPicker('add')}${langPicker('add')}
  <button class="btn block" style="margin-top:12px" data-act="addq">הוסף לסוף התור</button></div></details>`;
  h += `<h2>הסבב היומי</h2><div class="panel">
  <label class="f">שעת פתיחה כל יום</label><select class="field" data-f="set.sh">${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${i == s.sh ? 'selected' : ''}>${hh(i)}</option>`).join('')}</select>
  <div class="two"><div><label class="f">זמן לבחירה</label><select class="field" data-f="set.ph">${hoursOpt(s.ph)}</select></div><div><label class="f">זמן לדירוג</label><select class="field" data-f="set.rh">${hoursOpt(s.rh)}</select></div></div>
  <button class="btn block" data-act="savesettings">שמור הגדרות</button>
  <p class="hint" style="margin:10px 0 0">השינוי חל מהסבב הבא.</p></div>
  <div class="row-actions"><button class="btn block" data-act="nextnow">פתח עכשיו את הנושא הבא בתור</button><button class="btn ghost block" data-act="go" data-v="new">פתח סבב מיידי עם נושא משלך</button></div>`;
  const ina = inactiveSet(), pl = Object.entries(S.players).sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0));
  h += `<h2>שחקנים (${pl.length - pl.filter(([u]) => ina.has(u)).length} פעילים מתוך ${pl.length})</h2>
  <p class="hint" style="margin:0 0 8px">שחקן לא פעיל לא נספר במונה "כולם נעלו". אם יבחר שיר, ישחק כרגיל. 🗑️ מוחק שחקן לגמרי, למשל זהות כפולה או שחקן בדיקה.</p>`;
  h += pl.map(([u, p]) => `<div class="qrow">${avatarHtml(u, 'sm')}<div class="qt">${esc(p.nick)}${u === me ? ' (את/ה)' : ''}<small>${p.fullName ? esc(p.fullName) + ', ' : ''}הצטרף/ה ${p.joined ? fmtDate(p.joined) : ''}, ${S.picks.filter(x => x.uid === u).length} שירים</small></div><button class="btn ${ina.has(u) ? 'ghost' : ''}" style="min-height:40px;padding:6px 14px;font-size:14px" data-act="toggleactive" data-v="${esc(u)}">${ina.has(u) ? 'לא פעיל' : 'פעיל'}</button>${u === me || u === S.admin ? '' : `<button class="btn ghost danger" style="min-height:40px;padding:6px 12px;font-size:14px;margin-inline-start:6px" data-act="delplayer" data-v="${esc(u)}" aria-label="מחק שחקן">🗑️</button>`}</div>`).join('');
  return h;
}
function steps(ph) {
  const order = ['pick', 'rate', 'done'], names = { pick: 'בחירה', rate: 'דירוג וניחוש', done: 'תוצאות' }, i = order.indexOf(ph);
  return `<div class="steps">${order.map((k, j) => `<div class="${j === i ? 'on' : j < i ? 'past' : ''}">${names[k]}</div>`).join('')}</div>`;
}
function roundView(r) {
  const ph = phase(r), picks = S.picks.filter(p => p.rid === r.id), adm = isAdmin();
  let h = `<button class="back" data-act="go" data-v="home">→ כל הסבבים</button><div class="display topic">${esc(r.topic)}</div>${topicImgHtml(r)}${langBanner(r)}`;
  const legend = `<p class="legend">🎯 התאמה לנושא<br>✨ ${esc(m2of(r))}</p>`;
  if (ph === 'pick') {
    const mine = picks.find(p => p.uid === me), k = 'pk:' + r.id;
    const d = draft(k, () => mine ? { title: mine.title, artist: mine.artist || '', url: mine.url || '', artwork: mine.artwork || '', previewUrl: mine.previewUrl || '', trackId: mine.trackId || '', album: mine.album || '', source: mine.source || 'manual', q: '' } : { title: '', artist: '', url: '', artwork: '', previewUrl: '', trackId: '', album: '', source: 'manual', q: '' });
    h += `<div class="clock">נשארו <b data-ends="${r.pickEnds}">${fmtLeft(r.pickEnds - now())}</b> לבחירה. ${picks.length} כבר בחרו.</div>${legend}`;
    markSeen(r.id);
    if (mine && mine.locked) h += `<div class="panel lockcard"><div class="lk">🔒</div><b>הבחירה שלך נעולה</b>${songCard(mine, { compact: true })}</div>`;
    else h += pickFormHtml(r, mine, k, d);
    if (adm) {
      const st = roundStatus(r);
      h += `<h2>מעקב (רק למנהל)</h2>` + trackerHtml(r);
      if (picks.length >= 2) h += `<div class="row-actions"><button class="btn ${st.all ? '' : 'ghost'} block" data-act="endpick">${st.all ? '✓ כולם נעלו. התחל דירוג עכשיו' : 'התחל דירוג עכשיו בכל זאת'}</button></div>`;
    }
    h += `<p class="hint" style="margin-top:14px">בשלב הדירוג השירים מוצגים בלי שמות, וכל אחד מנחש מי בחר מה. ניחוש נכון שווה נקודת בונוס.</p>`;
  }
  else if (ph === 'rate') {
    const order = picks.slice().sort((a, b) => hash(r.id + a.uid) - hash(r.id + b.uid));
    const sd = S.ratings.find(x => x.rid === r.id && x.uid === me) || {};
    const saved = { scores: sd.scores || {}, guesses: sd.guesses || {}, bet: sd.bet || '' };
    if (!rateDraft[r.id]) rateDraft[r.id] = JSON.parse(JSON.stringify(saved));
    const d = rateDraft[r.id];
    if (d.bet === undefined) d.bet = saved.bet;
    const others = order.filter(p => p.uid !== me);
    const cands = picks.map(p => p.uid).filter(u => u !== me).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'he'));
    const doneN = others.filter(p => d.scores[p.uid] && d.scores[p.uid].fit && d.scores[p.uid].fun).length;
    const locked = !!sd.locked, dis = locked ? 'disabled' : '';
    const dirty = JSON.stringify(d) !== JSON.stringify(saved);
    h += `<div class="clock">נשארו <b data-ends="${r.rateEnds}">${fmtLeft(r.rateEnds - now())}</b> לדירוג. מי שבחר/ה שיר ולא דירג/ה את כולם לא מקבל/ת נקודות על השיר.</div>`;
    if (locked) h += `<div class="banner">🔒 הדירוג שלך נעול. התוצאות ייחשפו בסוף הזמן.</div>`;
    h += `<div class="playlist">${playlistHead(order)}`;
    h += order.map(p => {
      if (p.uid === me) return songCard(p, { self: true, tag: 'השיר שלך, לא מדרגים אותו' });
      const tok = songTok(r.id, p.uid);
      const v = d.scores[p.uid] || {};
      const slider = (k, cls) => { const val = v[k] || 0, pct = val ? (val - 1) / 9 : 0.5;
        return `<div class="slider ${cls || ''} ${val ? 'set' : ''} ${locked ? 'dis' : ''}" role="slider" tabindex="${locked ? -1 : 0}" aria-valuemin="1" aria-valuemax="10" aria-valuenow="${val || ''}" data-slide="${tok}" data-k="${k}" style="--p:${pct}"><div class="trk"><div class="fill"></div><div class="thumb"></div></div><span class="sval">${val || 'גררו'}</span></div><div class="sticks"><span>1</span><span>10</span></div>` };
      const ten = scaleOf(r) === 10;
      const dots = k => [1, 2, 3, 4, 5].map(n => `<button class="${v[k] === n ? 'on' : ''}" data-act="rate" data-u="${tok}" data-k="${k}" data-n="${n}" aria-label="${n}" ${dis}>${n}</button>`).join('');
      const gs = cands.length > 1 ? `<div class="scale"><span>🕵️ מי בחר את השיר? (בונוס)</span><div class="chips guess">${cands.map(u => `<button class="${d.guesses[p.uid] === u ? 'on' : ''}" data-act="guess" data-u="${tok}" data-g="${esc(u)}" ${dis}>${withAv(u, 'xxs')}</button>`).join('')}</div></div>` : '';
      const ok = v.fit && v.fun;
      const bet = others.length >= 2 ? `<button class="betbtn ${d.bet === p.uid ? 'on' : ''}" data-act="bet" data-u="${tok}" ${dis}>${d.bet === p.uid ? '🎰 הימרת שהשיר הזה ינצח' : '🎰 להמר שהשיר הזה ינצח (+1)'}</button>` : '';
      return songCard(p, { tag: ok ? '✓ דורג' : '', body: `<div class="rates">
        <div class="scale"><span>🎯 כמה מתאים לנושא</span>${ten ? slider('fit') : `<div class="dots">${dots('fit')}</div>`}</div>
        <div class="scale"><span>✨ ${esc(m2of(r))}</span>${ten ? slider('fun', 'fun') : `<div class="dots fun">${dots('fun')}</div>`}</div>${gs}${bet}</div>` });
    }).join('') + '</div>';
    if (adm) {
      const st = roundStatus(r);
      h += `<h2>מעקב (רק למנהל)</h2>` + trackerHtml(r) + `<div class="row-actions"><button class="btn ${st.all ? '' : 'ghost'} block" data-act="endrate">${st.all ? '✓ כולם נעלו. חשוף תוצאות עכשיו' : 'חשוף תוצאות עכשיו בכל זאת'}</button></div>`;
    }
    h += `<div style="height:70px"></div>`;
    if (others.length && !locked) h += `<div class="savebar"><div class="in"><div class="prog">דירגת ${doneN} מתוך ${others.length}</div><button class="btn ghost" data-act="saverate" ${(!dirty || busy) ? 'disabled' : ''}>${dirty ? 'שמור' : 'נשמר'}</button><button class="btn" data-act="lockrate" ${(doneN < others.length || busy) ? 'disabled' : ''}>נעל 🔒</button></div></div>`;
  }
  else {
    const rd = roundData(r), rows = rd.rows;
    if (!rows.length) return h + `<p class="muted">אף אחד לא בחר שיר בסבב הזה.</p>` + (adm ? `<div class="row-actions"><button class="btn ghost block danger" data-act="delround">🗑️ מחק את הסבב</button></div>` : '');
    h += `<button class="btn ghost block" data-act="replay" style="margin-bottom:14px">🎬 לצפות בחשיפה שוב</button>`;
    maybeReveal(r);
    const rated = rows.filter(x => x.n && x.complete);
    const fun = rated.slice().sort((a, b) => b.fun - a.fun)[0], fit = rated.slice().sort((a, b) => b.fit - a.fit)[0];
    if (fun && fit) h += `<div class="awards"><div class="award"><small>🎯 הכי מתאים לנושא</small><b>${esc(fit.title)}</b><small style="margin-top:4px">${esc(nameOf(fit.uid))}</small></div><div class="award"><small>✨ ${esc(m2of(r))}</small><b>${esc(fun.title)}</b><small style="margin-top:4px">${esc(nameOf(fun.uid))}</small></div></div>`;
    const top = rows[0].pts;
    h += `<div class="playlist">${playlistHead(rows)}</div>${legend}`;
    h += rows.map((x, i) => `<div class="res ${x.pts > 0 && x.pts === top ? 'win' : ''}"><div class="rk">${i + 1}</div>${artHtml(x, 'sm')}<div><button class="who linkbtn" data-act="prof" data-v="${esc(x.uid)}">${withAv(x.uid, 'xs')}${x.uid === me ? ' (את/ה)' : ''}</button><div class="sg">${esc(x.title)}${x.artist ? ' / ' + esc(x.artist) : ''}</div></div><div class="pts">${x.pts}</div>
    <div class="sub">${x.complete ? `<span>🎯 ${x.fit.toFixed(1)}</span><span>✨ ${x.fun.toFixed(1)}</span>` : '<span style="color:var(--warn);font-weight:700">לא סיים/ה לדרג, 0 נקודות</span>'}${x.gTot ? `<span>🕵️ ${x.gRight}/${x.gTot} ניחשו</span>` : ''}${x.bets ? `<span>🎰 ${x.bets} הימרו עליו</span>` : ''}${x.hive ? '<span>🐑 Hive Mind</span>' : ''}</div>${linksHtml(x)}</div>`).join('');
    const b = Object.entries(rd.bonus).sort((a, c) => c[1] - a[1]);
    h += `<h2>בונוס ניחושים</h2>` + (b.length ? b.map(([u, c]) => `<div class="qrow"><div class="qt">${esc(nameOf(u))}</div><b>+${c}</b></div>`).join('') : `<p class="muted">אף אחד לא ניחש נכון הפעם.</p>`);
    if (Object.keys(rd.betMade).length) { const bw = Object.keys(rd.betBonus);
      h += `<h2>הימור על המנצח</h2>` + (bw.length ? bw.map(u => `<div class="qrow"><div class="qt">${esc(nameOf(u))}</div><b>+1</b></div>`).join('') : `<p class="muted">אף אחד לא הימר על השיר המנצח.</p>`) }
    h += `<p class="hint" style="margin-top:12px">${scaleOf(r) === 10 ? 'ניקוד שיר: הממוצע של 🎯 ו-✨ מכל המדרגים, מ-1 עד 10.' : 'ניקוד שיר: ממוצע (🎯 + ✨) מכל המדרגים, עד 10.'} כל ניחוש נכון: נקודה נוספת. הימור נכון על המנצח: נקודה נוספת.</p>`;
  }
  if (adm) h += `<div class="row-actions"><button class="btn ghost block danger" data-act="delround">🗑️ מחק את הסבב</button></div>`;
  return h;
}
function boardView() {
  const ws = weekStart(), rs = doneRounds().filter(r => boardMode === 'all' || r.rateEnds >= ws);
  const ag = aggregate(rs), rows = Object.values(ag.P).sort((a, b) => b.total - a.total || b.wins - a.wins);
  let h = `<div class="brand"><span class="display">🏆 מובילים</span></div>
  <div class="seg"><button class="${boardMode === 'week' ? 'on' : ''}" data-act="bm" data-v="week">השבוע</button><button class="${boardMode === 'all' ? 'on' : ''}" data-act="bm" data-v="all">כל הזמנים</button></div>`;
  { const pw = prevWeekRange(); if (weekSummary(pw.from, pw.to)) h += `<button class="btn ghost block" data-act="weekly" style="margin-bottom:14px">🎬 סיכום השבוע שעבר</button>` }
  if (rows.length) {
    const lead = rows[0];
    h += `<div class="hero"><small>${boardMode === 'week' ? 'מוביל/ה השבוע' : 'מוביל/ה בכל הזמנים'}, ${ag.count} סבבים</small><span class="display">${esc(nameOf(lead.uid))}</span><small>${lead.total} נקודות, ${lead.wins} ניצחונות</small></div>`;
    h += rows.map((x, i) => `<button class="lb" data-act="prof" data-v="${esc(x.uid)}"><span class="rk">${i + 1}</span><span class="nm">${withAv(x.uid, 'sm')}${x.uid === me ? ' (את/ה)' : ''}<small>${x.played} סבבים, ${x.wins} ניצחונות${x.bonus ? ', +' + x.bonus + ' מניחושים' : ''}${x.bet ? ', +' + x.bet + ' מהימורים' : ''}</small></span><span class="p">${x.total}</span></button>`).join('');
  } else h += `<div class="empty" style="padding:24px 8px"><div class="display" style="font-size:36px">${boardMode === 'week' ? 'עוד אין תוצאות השבוע' : 'עוד אין תוצאות'}</div><p class="muted">הלוח מתמלא כשסבב מגיע לשלב התוצאות.</p></div>`;
  const T = titles().filter(t => t.u.length);
  h += `<h2>תארים</h2>` + (T.length ? `<div class="titles">${T.map(t => `<div class="ttl"><span class="ic">${t.ic}</span><div><b>${t.n}</b><small>${esc(t.d)}</small><div class="holders">${t.u.map(u => esc(nameOf(u))).join(', ')}</div></div></div>`).join('')}</div>` : `<p class="muted">התארים יחולקו אחרי הסבבים הראשונים.</p>`);
  h += `<p class="hint" style="margin-top:12px">השבוע מתחיל ביום ראשון. לחיצה על שם פותחת פרופיל.</p>`;
  return h;
}
function profileView(uid) {
  const ag = aggregate(doneRounds()).P[uid] || { wins: 0, fitN: 0, fitSum: 0, funN: 0, funSum: 0, bonus: 0, gMade: 0, total: 0, played: 0 };
  const songs = S.picks.filter(p => p.uid === uid);
  const T = titles().filter(t => t.u.includes(uid));
  const stat = (ic, l, v) => `<div class="stat"><span>${ic}</span><b>${v}</b><small>${l}</small></div>`;
  const recent = songs.map(p => ({ p, r: S.rounds.find(r => r.id === p.rid) })).filter(x => x.r).sort((a, b) => b.r.createdAt - a.r.createdAt).slice(0, 10);
  let h = `<button class="back" data-act="go" data-v="board">→ מובילים</button><div class="profhead">${avatarHtml(uid, 'xl')}${uid === me ? `<div class="photobtns"><label class="btn ghost sm">📷 ${safePhoto((S.players[me] || {}).photo) ? 'החלף תמונה' : 'הוסף תמונה'}<input type="file" accept="image/*" data-photo="1" hidden></label>${safePhoto((S.players[me] || {}).photo) ? '<button class="btn ghost sm" data-act="rmphoto">הסר</button>' : ''}</div>` : ''}</div><div class="display topic" style="font-size:56px;margin-bottom:${S.players[uid] && S.players[uid].fullName ? '2px' : '18px'}">${esc(nameOf(uid))}</div>${S.players[uid] && S.players[uid].fullName ? `<p class="muted" style="margin:0 0 16px;font-size:14px">${esc(S.players[uid].fullName)}</p>` : ''}`;
  if (uid === me) h += authGoogle
    ? `<div class="panel idok" style="margin-bottom:14px">🔐 <b>מגובה עם Google</b><small>${esc(authGoogle.email || '')}. במכשיר חדש: "כבר גיביתי? התחברות עם Google" במסך הכניסה.</small></div>`
    : `<div class="panel" style="margin-bottom:14px"><b>🔐 גיבוי החשבון</b><small class="muted" style="display:block;font-size:13px;margin-top:4px">גבו עם Google, ותוכלו להתחבר מכל מכשיר ולחזור לכל ההיסטוריה בלי לחכות למנהל. המייל לא מוצג לאף אחד.</small><button class="btn block" style="margin-top:10px" data-act="gbackup">גבה עם Google</button></div>`;
  if (T.length) h += `<div class="badges">${T.map(t => `<span class="badge">${t.ic} ${t.n}</span>`).join('')}</div>`;
  h += `<div class="stats">
    ${stat('🏆', 'ניצחונות יומיים', ag.wins)}
    ${stat('⭐', 'נקודות בסך הכל', ag.total)}
    ${stat('🎯', 'ממוצע התאמה (מתוך 10)', ag.fitN ? (ag.fitSum / ag.fitN).toFixed(1) : '–')}
    ${stat('😂', 'ממוצע מצחיק (מתוך 10)', ag.funN ? (ag.funSum / ag.funN).toFixed(1) : '–')}
    ${stat('🎵', 'שירים שנבחרו', songs.length)}
    ${stat('🔥', 'סבבים ברצף', streak(uid))}
    ${stat('🔮', 'ניחושים נכונים', ag.gMade ? ag.bonus + '/' + ag.gMade : '–')}
    ${stat('🎰', 'הימורים נכונים', ag.betMade ? ag.bet + '/' + ag.betMade : '–')}
    ${stat('🕵️', 'ניחשו אותו/ה', ag.gOnTot ? Math.round(100 * ag.gOnRight / ag.gOnTot) + '%' : '–')}
  </div>`;
  if (recent.length) h += `<h2>בחירות אחרונות</h2>` + recent.map(({ p, r }) => {
    const done = phase(r) === 'done'; const row = done ? roundData(r).rows.find(x => x.uid === uid) : null;
    const show = done || uid === me;
    return `<div class="qrow"><div class="qt">${show ? esc(p.title) : '🔒 ייחשף בסוף הסבב'}<small>${esc(r.topic)}</small></div>${row ? `<b>${row.pts}</b>` : ''}</div>`;
  }).join('');
  return h;
}


/* ---------- animated results reveal ----------
   Plays once per round per device (remembered in localStorage), can be skipped,
   and can be replayed from the results screen. Lives in its own #reveal layer so
   live data updates re-rendering #app never interrupt it. */
let revealOn = null; const revealTimers = [];
function revealSeen(rid) { try { return localStorage.getItem('ptv_rev_' + rid) === '1' } catch (_) { return true } }
function markRevealSeen(rid) { try { localStorage.setItem('ptv_rev_' + rid, '1') } catch (_) { } }
function maybeReveal(r) {
  if (revealOn || revealSeen(r.id)) return;
  markRevealSeen(r.id);
  setTimeout(() => startReveal(r), 0);
}
function closeReveal() {
  revealTimers.splice(0).forEach(id => { clearTimeout(id); clearInterval(id) });
  stopRevealSong();
  const el = document.getElementById('reveal'); if (!el) return;
  el.hidden = true; el.innerHTML = ''; revealOn = null;
  document.body.classList.remove('rv-open');
}
function startReveal(r) {
  const el = document.getElementById('reveal'); if (!el) return;
  const rows = roundData(r).rows; if (!rows.length) return;
  closeReveal(); revealOn = r.id;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seq = rows.slice(0, Math.min(3, rows.length)).reverse();
  const top = rows[0].pts;
  el.innerHTML = `<div class="rv-in" role="dialog" aria-label="חשיפת התוצאות">
    <div class="rv-top"><span class="rv-label">התוצאות נחשפות</span><button class="rv-skip" data-rv="skip">דלג ⏭</button></div>
    <div class="display rv-topic">${esc(r.topic)}</div>${topicImgHtml(r, 'rv')}
    <div class="rv-stage" aria-live="polite"></div>
    <button class="btn block rv-done" data-rv="skip" hidden>לכל התוצאות</button></div>`;
  el.hidden = false; document.body.classList.add('rv-open');
  const stage = el.querySelector('.rv-stage');
  const medal = n => n === 1 ? '🥇' : n === 2 ? '🥈' : '🥉';
  const gap = reduce ? 700 : 2100;
  seq.forEach((x, i) => {
    revealTimers.push(setTimeout(() => {
      const place = rows.indexOf(x) + 1, win = x.pts > 0 && x.pts === top;
      const card = document.createElement('div');
      card.className = 'rv-card' + (win ? ' win' : '');
      card.innerHTML = `<div class="rv-medal">${medal(place)}</div>${artHtml(x, 'rv')}
        <div class="rv-info"><div class="rv-place">מקום ${place}</div><div class="t">${esc(x.title)}</div><div class="a">${esc(x.artist || '')}</div><div class="rv-who">${withAv(x.uid, 'xs')}${x.uid === me ? ' (את/ה)' : ''}</div></div>
        <div class="rv-pts">${x.pts}<small>נק׳</small></div>`;
      stage.prepend(card);
      if (i === seq.length - 1) {
        if (place === 1) playRevealSong(x, revealTimers);
        if (win && !reduce) confetti(el);
        el.querySelector('.rv-done').hidden = false;
      }
    }, (reduce ? 300 : 900) + i * gap));
  });
}
function confetti(host) {
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#E83E72', '#FFC93C', '#4BE0A3', '#5B8CFF', '#B45CFF'];
  for (let i = 0; i < 42; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * 0.6) + 's';
    c.style.animationDuration = (2.2 + Math.random() * 1.4) + 's';
    c.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
    box.appendChild(c);
  }
  host.appendChild(box);
  revealTimers.push(setTimeout(() => box.remove(), 4200));
}


/* ---------- weekly summary show ----------
   Opens by itself once per device on the first visit after the week ended (from Sunday),
   and can be replayed from the leaders screen. Reuses the reveal layer. */
let weeklyShown = null;
function maybeWeekly() {
  if (revealOn || !S.loaded.picks || !S.loaded.ratings || !S.players[me]) return;
  const { from, to } = prevWeekRange(), key = 'ptv_wk_' + from;
  try { if (localStorage.getItem(key) === '1') return } catch (_) { return }
  const sum = weekSummary(from, to); if (!sum) return;
  try { localStorage.setItem(key, '1') } catch (_) { }
  setTimeout(() => startWeekly(sum), 0);
}
function startWeekly(s) {
  const el = document.getElementById('reveal'); if (!el || !s) return;
  closeReveal(); revealOn = 'week:' + s.from; weeklyShown = s;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = `<div class="rv-in" role="dialog" aria-label="סיכום שבועי">
    <div class="rv-top"><span class="rv-label">סיכום שבועי</span><button class="rv-skip" data-rv="skip">סגור ✕</button></div>
    <div class="display rv-topic" style="margin-bottom:6px">השבוע שהיה</div>
    <p class="wk-range">${weekLabel(s)} · ${s.rounds} סבבים · ${s.songs} שירים</p>
    <div class="rv-stage" aria-live="polite"></div><div class="wk-extra"></div>
    <div class="wk-end" hidden><button class="btn block" data-rv="wkshare">📣 שתף את הסיכום בוואטסאפ</button><button class="btn ghost block" data-rv="skip" style="margin-top:8px">סגור</button></div></div>`;
  el.hidden = false; document.body.classList.add('rv-open');
  const stage = el.querySelector('.rv-stage'), extra = el.querySelector('.wk-extra');
  const medal = ['🥇', '🥈', '🥉'], gap = reduce ? 600 : 1900;
  const podium = s.rows.slice(0, 3).map((t, i) => ({ t, i })).reverse();
  let at = reduce ? 300 : 900;
  const later = fn => { revealTimers.push(setTimeout(fn, at)); at += gap };
  podium.forEach(({ t, i }) => later(() => {
    const card = document.createElement('div'); card.className = 'rv-card wk-pl' + (i === 0 ? ' win' : '');
    card.innerHTML = `<div class="rv-medal">${medal[i]}</div><span class="wk-av">${avatarHtml(t.uid)}</span>
      <div class="rv-info"><div class="rv-place">${i === 0 ? 'אלוף/ת השבוע' : 'מקום ' + (i + 1)}</div><div class="t">${esc(nameOf(t.uid))}${t.uid === me ? ' (את/ה)' : ''}</div><div class="a">${t.wins} ניצחונות${t.bonus + t.bet ? ' · +' + (t.bonus + t.bet) + ' בונוס' : ''}</div></div>
      <div class="rv-pts">${t.total}<small>נק׳</small></div>`;
    stage.prepend(card);
    if (i === 0 && !reduce) confetti(el);
  }));
  const songCardEl = (label, x, cls) => { const c = document.createElement('div'); c.className = 'rv-card wk-song ' + (cls || '');
    c.innerHTML = `<div class="rv-medal">${label[0]}</div>${artHtml(x, 'rv')}<div class="rv-info"><div class="rv-place">${label[1]}</div><div class="t">${esc(x.title)}</div><div class="a">${esc(x.artist || '')}</div><div class="rv-who">${withAv(x.uid, 'xs')}</div><div class="a">${esc(x.topic)}</div></div><div class="rv-pts">${x.pts}<small>נק׳</small></div>`;
    return c };
  if (s.best) later(() => { extra.appendChild(songCardEl(['🎵', 'השיר של השבוע'], s.best)); playRevealSong(s.best, revealTimers) });
  if (s.flop) later(() => extra.appendChild(songCardEl(['💀', 'Flop of the Week'], s.flop)));
  const lines = [];
  if (s.guesser) lines.push(`🔮 הכי הרבה ניחושים נכונים: <b>${s.guesser.u.map(u => esc(nameOf(u))).join(', ')}</b> (${s.guesser.n})`);
  if (s.bettor) lines.push(`🎰 הכי הרבה הימורים נכונים: <b>${s.bettor.u.map(u => esc(nameOf(u))).join(', ')}</b> (${s.bettor.n})`);
  later(() => { if (lines.length) { const p = document.createElement('div'); p.className = 'wk-lines'; p.innerHTML = lines.map(l => `<p>${l}</p>`).join(''); extra.appendChild(p) } el.querySelector('.wk-end').hidden = false });
}
