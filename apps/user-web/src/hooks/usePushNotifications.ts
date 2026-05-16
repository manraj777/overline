import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getFirebaseMessaging, hasFirebaseConfig } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui';
import { useNotificationSound } from './useNotificationSound';
import { useQueryClient } from '@tanstack/react-query';

interface IncomingNotification {
  id?: string;
  title?: string;
  body?: string;
  type?: string;
  data?: Record<string, any>;
}

function resolveWsBase(): string {
  if (typeof window === 'undefined') return '';
  return (
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '') ||
    window.location.origin
  );
}

/**
 * Foreground notification pipeline.
 *
 * Two transports feed the same `handleIncoming` reducer so that whichever
 * one fires first (FCM in production, Socket.io in dev/no-Firebase) the
 * user gets an identical experience: sound, vibration, toast, and a
 * background invalidation of the bookings/notifications queries so the
 * UI updates without a manual refresh.
 *
 * Background delivery (tab closed) is handled by `firebase-messaging-sw.js`.
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const { play } = useNotificationSound();
  const toast = useToast();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  // Keep the latest helpers in a ref so we can reference them from the
  // long-lived FCM/Socket listeners without re-subscribing on every render.
  const handlerRef = useRef<(n: IncomingNotification) => void>(() => {});
  handlerRef.current = (n: IncomingNotification) => {
    play();

    const variant = ((): 'success' | 'warning' | 'error' | 'info' => {
      const t = (n.type || '').toUpperCase();
      if (t.includes('CANCEL') || t.includes('REJECT') || t.includes('NO_SHOW')) return 'error';
      if (t.includes('CONFIRMED') || t.includes('COMPLETED')) return 'success';
      if (t.includes('REMINDER') || t.includes('PENDING') || t.includes('QUEUE')) return 'warning';
      return 'info';
    })();

    toast.addToast({
      type: variant,
      title: n.title || 'New notification',
      message: n.body,
      duration: 6000,
    });

    // Refresh anything the user is currently looking at.
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  // ─────────────────────────── FCM (browser push) ──────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function setupPush() {
      try {
        if (!hasFirebaseConfig) return;
        if (!('serviceWorker' in navigator)) return;

        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
        const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
        const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

        const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey)}&authDomain=${encodeURIComponent(authDomain)}&projectId=${encodeURIComponent(projectId)}&storageBucket=${encodeURIComponent(storageBucket)}&messagingSenderId=${encodeURIComponent(messagingSenderId)}&appId=${encodeURIComponent(appId)}`;

        const registration = await navigator.serviceWorker.register(swUrl);
        const messaging = await getFirebaseMessaging();
        if (!messaging || cancelled) {
          if (!messaging) console.warn('Push notifications not supported on this browser.');
          return;
        }

        if (registration.active) {
          registration.active.postMessage({
            type: 'INIT_FIREBASE',
            config: {
              apiKey,
              projectId,
              messagingSenderId,
              appId,
            },
          });
        }

        const permission = await Notification.requestPermission();
        if (cancelled || permission !== 'granted') return;

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
        const currentToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });
        if (currentToken && !cancelled) {
          api.post('/users/fcm-token', { token: currentToken }).catch(() => {});
        }

        onMessage(messaging, (payload) => {
          handlerRef.current({
            title: payload.notification?.title,
            body: payload.notification?.body,
            type: (payload.data as any)?.type,
            data: payload.data as any,
          });
        });
      } catch (err) {
        console.error('Push setup failed:', err);
      }
    }

    setupPush();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ────────────────────── Socket.io fallback / live ─────────────────────
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const base = resolveWsBase();
    if (!base) return;

    const socket = io(`${base}/events`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token: accessToken },
      extraHeaders: { Authorization: `Bearer ${accessToken}` },
    });

    socket.on('connect', () => {
      socket.emit('authenticate', { token: accessToken });
    });

    socket.on('notification', (payload: IncomingNotification) => {
      handlerRef.current(payload);
    });

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]);
}
