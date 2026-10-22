/* เก็บไฟล์ของระบบไว้ในเครื่อง เพื่อเปิดได้เร็วและเปิดได้ตอนเน็ตหลุด (ข้อมูลคะแนนจัดการโดย Firestore) */
const CACHE = 'classfolio-v16';
const CACHE_FONTS = ['fonts.css', 'fonts/THSarabunPSK-Regular.ttf', 'fonts/THSarabunPSK-Bold.ttf'];
const FILES = ['./', 'index.html', 'styles.css', ...CACHE_FONTS, 'calc.js', 'sync.js', 'platform.js', 'util.js', 'demo.js', 'xlsx.js', 'print.js', 'views.js', 'timetable.js', 'live.js', 'export.js', 'term.js', 'catalog.js', 'app.js', 'firebase-config.js', 'hero.webp', 'icons/icon-64.png', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
