// AHTRI FFA Service Worker for PWA compliance and offline fallback
const CACHE_NAME = 'ahtri-ffa-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER intercept cross-origin requests (e.g. Render backend API, OSM tiles, Nominatim, CDN)
  if (url.origin !== self.location.origin) return;

  // Skip dynamic backend API calls
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io') || url.port === '3000') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.destination === 'script' ||
            event.request.destination === 'style' ||
            event.request.destination === 'image' ||
            event.request.destination === 'font')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // If navigation request fails offline, fallback to cached root index.html or minimal offline response
        if (event.request.mode === 'navigate') {
          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;
          return new Response(
            '<!DOCTYPE html><html><body><h3>AHTRI FFA - Offline</h3><p>Please check your internet connection.</p></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            }
          );
        }

        // Return a valid Response object (never undefined) so respondWith never throws TypeError
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
