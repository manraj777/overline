importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

/**
 * Background FCM handler for the user-facing app.
 *
 * Two responsibilities:
 *   1. Show an OS notification when the page is hidden/closed (browsers
 *      handle the chime; we just produce a clickable banner).
 *   2. When the user taps the banner, open or focus the right page —
 *      typically the booking detail screen.
 *
 * The Firebase config is forwarded from the page via postMessage on
 * first load so we don't have to bake env vars into a static SW file.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const data = payload.data || {};
        const title = payload.notification?.title || 'Overline';
        const body = payload.notification?.body || '';

        // Pick a deep-link target. Prefer an explicit URL on the payload,
        // fall back to the booking detail screen if a bookingId is present.
        const url =
          data.url ||
          (data.bookingId ? `/bookings/${data.bookingId}` : '/bookings');

        // Use a stable tag per booking so repeated updates replace the
        // previous banner instead of piling up. `renotify` re-pings the
        // user (sound + buzz) when the same tag changes.
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
  }
});

/**
 * Tap-to-open: focus an existing tab on the deep-link path if we have
 * one, otherwise open a fresh window. Falls back gracefully when the
 * payload didn't carry a URL.
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
