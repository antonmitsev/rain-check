const CACHE_NAME = 'raincheck-app-__CACHE_VERSION__';
const CACHE_PREFIX = 'raincheck-app-';
const SCOPE = self.registration.scope;
const home = new URL('./', SCOPE);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const manifestResponse = await fetch(new URL('./precache-manifest.json', SCOPE), {
      cache: 'no-store'
    });
    if (!manifestResponse.ok) throw new Error('Could not load PWA precache manifest');
    const paths = await manifestResponse.json();
    if (!Array.isArray(paths)) throw new Error('Invalid PWA precache manifest');
    const urls = [home.href, ...paths.map(path => new URL(path, SCOPE).href)];
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(home.pathname)) return;

  // Version metadata must always reflect the deployment, never an offline cache.
  if (url.pathname === new URL('./version.json', SCOPE).pathname) {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(home.href, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(home.href)) || Response.error()));
    return;
  }

  // The hashed JavaScript and CSS are precached during installation.
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && url.pathname.includes('/assets/')) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
    }
    return response;
  })));
});
