// Service Worker for ED Guidelines Assistant
const CACHE_NAME = 'ed-guidelines-v1';

// App shell files to cache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  // Add CSS, JS, and other static assets here
];

// Critical guidelines to cache for offline access
// TODO: Add critical guideline URLs here
const CRITICAL_GUIDELINES = [
  // '/api/guidelines/cardiac-arrest',
  // '/api/guidelines/stroke',
  // '/api/guidelines/sepsis',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first strategy for API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(cacheFirst(request));
});

// Network-first strategy: try network, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // TODO: Return offline fallback for critical guidelines
    throw error;
  }
}

// Cache-first strategy: try cache, fall back to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Fetch failed:', request.url);
    // TODO: Return offline fallback page
    throw error;
  }
}

// TODO: Add background sync for offline guideline updates
// self.addEventListener('sync', (event) => {
//   if (event.tag === 'sync-guidelines') {
//     event.waitUntil(syncGuidelines());
//   }
// });

// TODO: Add push notification support for critical updates
// self.addEventListener('push', (event) => {
//   const data = event.data.json();
//   self.registration.showNotification(data.title, data.options);
// });
