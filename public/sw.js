// public/sw.js
// Bump CACHE on every change to this file so old caches are cleared.
const CACHE = 'neurallearn-v2';

// Only things that never change per user. Missing files won't break install.
const PRECACHE = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never touch writes, cross-origin traffic (Clerk, YouTube, GitHub, APIs)
  // or range requests (video/audio).
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;

  // Page loads: always go to the network so sign-in, handshakes and fresh
  // deploys work. Only show the offline page if the network is unreachable.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Cache-first ONLY for build-hashed bundles and icons, which are safe to keep.
  // Everything else (/api/*, Clerk, data, images) goes straight to the network.
  const isStatic =
    url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
