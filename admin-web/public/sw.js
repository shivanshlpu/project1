// AHTRI FFA Service Worker for PWA compliance and offline fallback
const CACHE_NAME = 'ahtri-ffa-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for navigation and static assets
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip dynamic backend API calls
  if (url.pathname.startsWith('/api') || url.port === '3000') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
