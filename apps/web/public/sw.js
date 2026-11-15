const CACHE = 'personal-finance-shell-v1';
const SHELL = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

function isPrivateRequest(request) {
  const url = new URL(request.url);
  return request.headers.has('authorization')
    || url.pathname.startsWith('/rest/v1/')
    || url.pathname.startsWith('/auth/v1/')
    || url.pathname.startsWith('/functions/v1/')
    || url.hostname.includes('supabase');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || isPrivateRequest(request)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !['style', 'script', 'font', 'image', 'manifest'].includes(request.destination)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (!response.ok || response.type !== 'basic') return response;
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(request, copy));
    return response;
  })));
});
