import { useEffect } from 'react';
import { getFirebaseMessaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import api from '@/lib/api';

export function usePushNotifications(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    async function setupPush() {
      try {
        if (!('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = await getFirebaseMessaging();
        
        if (!messaging) {
          console.warn('Push notifications not supported on this browser.');
          return;
        }

        // Send config to SW for background messages
        if (registration.active) {
            registration.active.postMessage({
                type: 'INIT_FIREBASE',
                config: {
                    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
                }
            });
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // You must create a Web Push certificate key pair in Firebase Console
          // and put it in NEXT_PUBLIC_FIREBASE_VAPID_KEY for production web push
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
          
          const currentToken = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration 
          });

          if (currentToken) {
            await api.post('/users/fcm-token', { token: currentToken });
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // Optionally show toast notification here
          });
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
      }
    }

    setupPush();
  }, [isAuthenticated]);
}
