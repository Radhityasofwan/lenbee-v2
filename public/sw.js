// Service worker minimal: cache aset statis, biarkan data selalu dari jaringan.
const CACHE = "lenbee-static-v1";
const PRECACHE = ["/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data dinamis dan API selalu network-first agar tidak pernah basi.
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});

/* ------------------------------------------------------------------ */
/* Push notifications                                                  */
/* ------------------------------------------------------------------ */

self.addEventListener("push", (event) => {
  let data = { title: "Lenbee", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Payload bukan JSON — pakai default di atas.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url: data.url },
      tag: data.url,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === url && "focus" in client) return client.focus();
      }
      if (clientList.length > 0 && "focus" in clientList[0]) {
        clientList[0].navigate(url);
        return clientList[0].focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
