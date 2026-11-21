/* FieldTech Direct — Service Worker (PWA)
 * - Shell statis: dibuka instan dari cache, diperbarui di latar (stale-while-revalidate).
 * - Permintaan ke Google Apps Script TIDAK PERNAH di-cache (data selalu segar & aman).
 * - Offline: halaman tetap terbuka dari cache; navigasi jatuh ke index.html.
 * - Pembaruan: versi baru menunggu persetujuan pengguna (tidak memutus isian form). */
const VERSION = '2.1.0';
const CACHE = 'fd-shell-v' + VERSION;
const SHELL = ['./', './index.html', './css/style.css', './js/config.js', './js/core.js', './js/app.js', './js/profil.js', './js/customer.js', './js/tech.js', './js/admin.js', './js/suara.js', './js/chat.js', './audio/pesanan-masuk-chime.mp3', './manifest.json', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './audio/chat-bubble.mp3'];
const CDN = /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); }); // tanpa skipWaiting otomatis
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('fd-shell-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;                                        // POST (API) tidak disentuh
  if (u.hostname.endsWith('script.google.com') || u.hostname.endsWith('googleusercontent.com')) return; // API GAS: langsung ke jaringan
  if (u.origin === location.origin) {
    if (r.mode === 'navigate') { // buka aplikasi: cache dulu, perbarui di latar, offline → index.html
      e.respondWith(caches.open(CACHE).then(async c => {
        const hit = await c.match('./index.html');
        const net = fetch(r).then(res => { if (res.ok) c.put('./index.html', res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }));
      return;
    }
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  } else if (CDN.test(u.hostname)) { // pustaka & font: cache-first
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }))));
  }
});

// Klik notifikasi tugas → fokus ke aplikasi yang sudah terbuka, lalu buka tugas tersebut
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    const c = list.find(function (x) { return 'focus' in x; });
    if (c) { c.postMessage({ type: 'open', url: url }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
