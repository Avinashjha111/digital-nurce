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

// New WhatsApp message from a patient -- the webhook pushes a payload
// shaped like { title, body, url } (see src/lib/push.ts).
self.addEventListener("push", (event) => {
  let payload = { title: "Digital Nurse", body: "You have a new message.", url: "/clinic/inbox" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // non-JSON payload -- fall back to the default above
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
      tag: payload.url, // replaces any earlier notification for the same chat instead of stacking
    })
  );
});

// Focus an already-open tab on that conversation if there is one, otherwise
// open a new one -- same "jump straight to the chat" behavior as a native app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/clinic/inbox";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
