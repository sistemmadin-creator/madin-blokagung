// Service Worker untuk Web Push Notification - Madin Blokagung
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'Madin Blokagung',
      body: event.data.text()
    };
  }

  const title = payload.title || 'Madrasah Diniyyah Al-Amiriyyah';
  const options = {
    body: payload.body || 'Pemberitahuan baru dari Madin Blokagung',
    icon: payload.icon || '/logo-madin.png',
    badge: payload.badge || '/logo-madin.png',
    image: payload.image || undefined,
    data: {
      url: payload.url || '/'
    },
    vibrate: [200, 100, 200],
    tag: payload.tag || 'madin-notification-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    actions: payload.actions || [
      { action: 'open', title: 'Buka Web' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
