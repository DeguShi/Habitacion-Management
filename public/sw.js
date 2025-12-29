/**
 * Habitación Service Worker (App Shell Only)
 * 
 * This SW caches static assets only.
 * Data is sourced from IndexedDB, NOT from SW cache.
 */

const CACHE_NAME = 'habitacion-shell-v1';

// App shell assets to cache
// Next.js will add hashed JS/CSS chunks automatically via navigation
const SHELL_ASSETS = [
    '/',
    '/manifest.json',
    '/logo-hab.png',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(SHELL_ASSETS).catch(err => {
                console.warn('[SW] Some shell assets failed to cache:', err);
            });
        })
    );
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('habitacion-') && name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Claim all clients immediately
    self.clients.claim();
});

// Fetch: cache-first for static assets, network-only for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // NEVER cache API requests — IndexedDB is the source of truth
    if (url.pathname.startsWith('/api/')) {
        return; // Let browser handle normally
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For navigation and static assets: stale-while-revalidate
    if (event.request.mode === 'navigate' ||
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)$/)) {

        event.respondWith(
            caches.match(event.request).then((cached) => {
                // Return cached if available
                const fetchPromise = fetch(event.request).then((response) => {
                    // Only cache successful responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Network failed, cached is our only hope
                    return cached;
                });

                // Return cached immediately, update in background
                return cached || fetchPromise;
            })
        );
    }
});

// Handle messages from client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Script loaded');
