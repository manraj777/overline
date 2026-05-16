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
    const title = payload.notification?.title || 'Overline Admin';
    const body = payload.notification?.body || '';

    let url = data.url;
    if (!url) {
      if (data.bookingId) {
        url = `/owner/bookings?id=${data.bookingId}`;
      } else if ((data.type || '').toUpperCase().includes('QUEUE')) {
        url = '/owner/queue';
      } else {
        url = '/owner/dashboard';
      }
    }

    const tag = data.bookingId
      ? `booking:${data.bookingId}`
      : `overline-admin:${data.type || 'notice'}`;

    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: { url, ...data },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/owner/dashboard';
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    // Already initialized at top level
  }
});
