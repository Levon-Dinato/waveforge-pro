// public/sw.js
const CACHE_NAME = 'waveforge-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Installation : mise en cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch : network-first pour HTML/JS, cache-first pour images
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore les requêtes non-GET et cross-origin
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // API Treblo : ne pas cacher
  if (request.url.includes('/api/treblo')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache les assets statiques
        if (response.ok && request.destination !== '') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache si offline
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback pour les navigations
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});