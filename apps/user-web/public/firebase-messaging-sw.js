importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

const firebaseConfig = {
  // Config uses query params or fallback
};

// Next.js static asset serving doesn't let us easily inject env vars.
// We will just listen for a message to initialize or hardcode it.
// The easiest for PWA is to initialize messaging on the SW.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification?.title || 'Overline';
        const notificationOptions = {
          body: payload.notification?.body,
          icon: '/overline-logo.png'
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  }
});
