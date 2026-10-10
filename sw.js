/* ==========================================================
   GRDA INTERCONNECTIVITY HUB — SERVICE WORKER
   Scoped to the project root. This caches only the hub's own
   shell files. It intentionally does NOT touch requests under
   /eastern/, /central/, or /western/ - those subfolders each
   have their own, more specific service worker, which the
   browser's scope-matching rules give priority over this one
   for requests inside those paths. The explicit pass-through
   below is an extra safety net on top of that.
========================================================== */

const CACHE_NAME = 'grda-hub-v2';

const HUB_SHELL_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(HUB_SHELL_FILES))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Never intercept requests for the corridor subfolders - let
    // their own service workers (or the network) handle those.
    if (
        url.pathname.startsWith('/eastern/') ||
        url.pathname.startsWith('/central/') ||
        url.pathname.startsWith('/western/')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});