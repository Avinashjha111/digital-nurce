// Minimal service worker -- exists so the app meets install criteria on
// browsers that require one (mainly Android Chrome). Deliberately does
// NOT cache pages/API responses: this is a real-time clinic app (patient
// messages, reminder status), so serving stale data offline would be
// actively wrong. It just passes every request straight through to the
// network.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
