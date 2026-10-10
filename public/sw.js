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
      // ✅ Ne cache QUE les réponses complètes (200), pas les 206 (Partial Content)
      // Cela évite l'erreur "Partial response is unsupported"
      if (
        response.status === 200 &&
        request.destination !== '' &&
        request.destination !== 'video'  // Ne pas cacher les vidéos
      ) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone).catch((err) => {
            // Ignore silencieusement les erreurs de cache
            console.debug('Cache skip:', request.url);
          });
        });
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