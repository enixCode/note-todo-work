// Network-first service worker - no caching, fast refresh
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
