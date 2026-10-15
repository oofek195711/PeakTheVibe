/* PeakTheVibe service worker.
   Its only jobs are to make the game installable and to show a friendly page when offline.
   It deliberately caches NOTHING: every page and file always comes fresh from the network,
   so an update on GitHub reaches players exactly as before. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return; // files, Firebase, music search: untouched
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>PeakTheVibe</title><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#17122A;color:#F2EDFF;font-family:system-ui,sans-serif;text-align:center;padding:24px">' +
    '<div><div style="font-size:56px">📡</div><h1 style="margin:8px 0">אין חיבור לאינטרנט</h1><p style="opacity:.8">PeakTheVibe צריך אינטרנט כדי לעבוד. נסו שוב כשהחיבור יחזור.</p>' +
    '<button onclick="location.reload()" style="margin-top:12px;border:0;border-radius:999px;padding:12px 22px;font-size:16px;font-weight:700;background:#FF6B98;color:#1A0F22">נסו שוב</button></div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
