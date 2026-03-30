// public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Incoming Call", {
      body: data.body || "A new call is waiting.",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: data.tag || "incoming-call",
      renotify: data.renotify ?? true,
      requireInteraction: data.requireInteraction ?? true,
      actions: data.actions || [{ action: "open", title: "Open" }],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client)
            return client.focus();
        }
        return clients.openWindow("/");
      })
  );
});
