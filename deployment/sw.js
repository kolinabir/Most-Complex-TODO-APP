// TodoLang Service Worker v1.0.0
const CACHE_NAME = 'todolang-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/todolang-app.js',
  '/js/polyfills.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});