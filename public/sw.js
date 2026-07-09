/// <reference lib="webworker" />

const CACHE_NAME = "vbweb-2026-06-21-v2";
const PRECACHE_URLS = ["/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // Never serve the service worker script itself from a runtime cache.
  if (url.pathname === "/sw.js") return;

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request.url, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "follow",
      })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put("/index.html", clone));
          }
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Static assets (JS, CSS): stale-while-revalidate.
  // Hashed filenames (Vite) ensure new deploys get new URLs, so a brief stale
  // read is safe while we fetch the latest copy in the background.
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      }),
    );
    return;
  }

  // Images and fonts: stale-while-revalidate.
  // Public image URLs are not always content-hashed, so refresh cached copies
  // in the background while still keeping repeat visits fast.
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif|woff2?|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch((error) => {
            if (cached) return cached;
            throw error;
          });
        return cached || networkFetch;
      }),
    );
    return;
  }
});
