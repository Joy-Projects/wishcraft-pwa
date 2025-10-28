/* WishCraft PWA - Service Worker */
const CACHE_NAME = 'wishcraft-pwa-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()).then(() => notify('CACHE_COMPLETE'))
  );
});

function notify(msg) {
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then(clients => clients.forEach(c => c.postMessage(msg)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        event.waitUntil(fetch(req).then(res => caches.open(CACHE_NAME).then(c => c.put(req, res.clone()))).catch(() => {}));
        return cached;
      }
      return fetch(req)
        .then(res => { caches.open(CACHE_NAME).then(c => c.put(req, res.clone())); return res; })
        .catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
