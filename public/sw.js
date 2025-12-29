/**
 * Habitación Service Worker
 * 
 * Required for PWA standalone mode and offline support.
 */

const CACHE_NAME = 'habitacion-v1';

// Critical app shell assets
const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
    '/logo-hab.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching app shell');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .catch((err) => {
                console.warn('[SW] Precache failed:', err);
            })
    );
    self.skipWaiting();
});

// Activate: clean old caches and take control
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('habitacion-') && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            console.log('[SW] Now controlling all clients');
            return self.clients.claim();
        })
    );
});

// Fetch: Network-first for API, Cache-first for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // API requests: network only (IndexedDB is our offline data store)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Navigation requests: network first, fallback to cached index
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache successful navigation responses
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline: return cached page or index
                    return caches.match(event.request)
                        .then((cached) => cached || caches.match('/'));
                })
        );
        return;
    }

    // Static assets: cache first, network fallback
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Update cache in background
                fetch(event.request).then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response);
                        });
                    }
                }).catch(() => { });
                return cached;
            }
            // Not cached, fetch from network
            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});

// Handle messages
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

console.log('[SW] Loaded');
