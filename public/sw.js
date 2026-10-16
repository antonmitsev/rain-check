const CACHE_NAME = 'raincheck-app-v3';
const APP_SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('raincheck-app-') && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  // Always fetch deployment metadata from the network, never the PWA cache.
  if (url.pathname === new URL('./version.json', self.registration.scope).pathname) {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./', copy));
      }
      return response;
    }).catch(async () => (await caches.match('./')) || Response.error()));
    return;
  }
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && (url.pathname.includes('/assets/') || url.pathname.includes('/icons/'))) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
