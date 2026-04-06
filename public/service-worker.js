/* No-op service worker — satisfies /service-worker.js probes in dev (extensions, stale registrations). */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
