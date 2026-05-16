importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId')
};

if (firebaseConfig.apiKey && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = payload.notification?.title || 'Overline';
    const body = payload.notification?.body || '';

    const url =
      data.url ||
      (data.bookingId ? `/bookings/${data.bookingId}` : '/bookings');

    const tag = data.bookingId ? `booking:${data.bookingId}` : `overline:${data.type || 'notice'}`;

    self.registration.showNotification(title, {
      body,
      icon: '/overline-logo.png',
      badge: '/overline-logo.png',
      tag,
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: { url, ...data },
    });
  });
}

/**
 * Handle notification click event at top level.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl || clientUrl.href.endsWith(targetUrl)) {
          await client.focus();
          return;
        }
      } catch {}
    }
    if (allClients[0] && 'navigate' in allClients[0]) {
      try {
        await allClients[0].focus();
        await allClients[0].navigate(targetUrl);
        return;
      } catch {}
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

/**
 * Keep the message listener for potential future updates, 
 * but initialization is now top-level.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    // Already initialized at top level
  }
});
