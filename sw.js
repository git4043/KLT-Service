const CACHE_NAME = 'klt-service-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './app2.js',
    './supabase_db.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event - Precache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate event - Clean up old caches if CACHE_NAME changes
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Network First Strategy with Cache Fallback
self.addEventListener('fetch', event => {
    // Exclude Supabase API interactions from caching completely to ensure fresh realtime data
    if (event.request.url.includes('supabase.co/rest/v1') || event.request.method !== 'GET') {
        return; // Let the browser handle standard network request for API mapping
    }

    event.respondWith(
        fetch(event.request).then(networkResponse => {
            // If the network responds successfully, dynamically update our cache
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
        }).catch(() => {
            // If the user's connection fails (Offline), attempt to match from Cache
            return caches.match(event.request);
        })
    );
});
