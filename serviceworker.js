/* =========================================================
 * Service Worker — Auto Metadata AI
 * Cache app shell, biarkan API call lewat network
 * ========================================================= */

const CACHE_NAME = 'autometadata-v1.1';

// File yang di-cache saat install (app shell)
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip: bukan GET, cross-origin (API AI), atau request non-http
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (!url.protocol.startsWith('http')) return;

  // Cache-first untuk app shell
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        // Hanya cache response sukses & same-origin
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        return res;
      }).catch(() => {
        // Fallback offline untuk navigasi halaman
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // Untuk resource lain, biarkan gagal
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

/* ---------- MESSAGE (untuk update paksa dari halaman) ---------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
