const CACHE_NAME = "jobportal-cdn-v1";

/* ── Install: cache icons immediately ── */
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        "/icons/icon-192.png",
        "/icons/icon-512.png",
      ]);
    })
  );
});

/* ── Activate: wipe all old caches ── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch ── */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  /* Icons → serve from cache */
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  /* CDN assets only → cache forever (unpkg, cdnjs, google fonts — never change) */
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("unpkg.com") ||
    url.hostname.includes("cdnjs.cloudflare.com")
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  /* App shell + API → always network, never cache */
  /* This means deployments are always instant with no stale UI */
});