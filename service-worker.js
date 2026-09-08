const CACHE_PREFIX = 'kanye-series-';
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const PAGE_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}images-${CACHE_VERSION}`;

const APP_SHELL = [
  './', './index.html', './products.html', './product.html',
  './special-orders.html', './policy.html', './login.html', './signup.html',
  './forgot-password.html', './offline.html',
  './manifest.json', './js/pwa.js', './images/logo.png',
  './images/logo2.png', './images/logo3.png'
];

const PRIVATE_PATHS = [
  '/cart.html', '/checkout.html', '/orders.html', '/profile.html',
  '/wishlist.html', '/admin-'
];

const isPrivatePath = pathname => PRIVATE_PATHS.some(path => pathname.endsWith(path) || pathname.includes(path));
const isFirebaseRequest = url => /firebaseio\.com|firebaseapp\.com|googleapis\.com\/identitytoolkit|securetoken\.googleapis\.com/i.test(url.hostname + url.pathname);
const isPaymentRequest = url => /pesapal|payment|checkout/i.test(url.hostname + url.pathname);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(error => console.warn('[PWA] App shell precache incomplete:', error))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE].includes(key)).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await (await caches.open(PAGE_CACHE)).put(request, response.clone());
    return response;
  } catch (error) {
    const fallbackUrl = new URL(request.url);
    fallbackUrl.search = '';
    return caches.match(request).then(cached => cached || caches.match(fallbackUrl.href) || caches.match('./offline.html'));
  }
}

async function cacheFirstImage(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      const keys = await cache.keys();
      if (keys.length >= 150) await cache.delete(keys[0]);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (isFirebaseRequest(url) || isPaymentRequest(url)) return;
  if (request.destination === 'image' || /\.(?:png|jpe?g|gif|webp|avif|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    if (isPrivatePath(url.pathname)) return;
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (/\.(?:css|js|woff2?|ttf|eot|svg)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (!response.ok) return response;
      return caches.open(STATIC_CACHE).then(cache => { cache.put(request, response.clone()); return response; });
    })));
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
