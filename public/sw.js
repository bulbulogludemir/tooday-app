const CACHE = "tooday-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// network-first with cache fallback, so the app keeps opening offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE)
          .then((c) => c.put(event.request, copy))
          .catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
