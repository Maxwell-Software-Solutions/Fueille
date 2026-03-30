// Minimal service worker for offline-first behavior
const CACHE_NAME = 'fueille-app-shell-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/mock-data/current.json',
  '/offline',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests, try network first then fallback to cache (app shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Update the cache in the background
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match('/offline'))
    );
    return;
  }

  // For other requests, use cache-first then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener('message', (event) => {
  // Support a simple skipWaiting flow
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, tag, timestamp, url } = event.data.payload;
    const delay = timestamp - Date.now();
    if (delay <= 0) return;

    // Use Notification Triggers if available (Chrome 80+)
    if ('showTrigger' in Notification.prototype) {
      self.registration.showNotification(title, {
        body,
        tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url },
        showTrigger: new TimestampTrigger(timestamp),
      });
    }
    // setTimeout fallback handled by the page itself
  }

  if (event.data?.type === 'CANCEL_NOTIFICATION') {
    const { tag } = event.data.payload;
    self.registration.getNotifications({ tag }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (url) {
        // Try to focus an existing window at that URL, or open a new one
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      } else {
        // No URL — just focus any open app window
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      }
    })
  );
});
