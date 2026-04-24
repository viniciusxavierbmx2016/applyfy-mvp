self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nova notificação',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    image: data.image || undefined,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    renotify: true,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Members Club', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
