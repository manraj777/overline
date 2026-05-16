import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getFirebaseMessaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationSound } from './useNotificationSound';

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
 * Foreground notification pipeline for owners and staff.
 *
 * Same dual-transport design as user-web: FCM in production, Socket.io
 * `/events` channel as a live fallback. Both feed one handler that
 * chimes, toasts, vibrates, and refreshes booking/queue queries — so
 * the moment a customer requests a slot, the staff dashboard reacts.
 *
 * Background delivery (browser closed / phone locked) is handled by the
 * `firebase-messaging-sw.js` service worker.
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const { play } = useNotificationSound();
  const toast = useToast();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  const shopId = useAuthStore((s) => s.shopId);
  const handlerRef = useRef<(n: IncomingNotification) => void>(() => {});
  handlerRef.current = (n: IncomingNotification) => {
    play();

    const variant = ((): 'success' | 'warning' | 'error' | 'info' => {
      const t = (n.type || '').toUpperCase();
      if (t.includes('CANCEL') || t.includes('REJECT') || t.includes('NO_SHOW')) return 'error';
      if (t.includes('CREATED') || t.includes('NEW') || t.includes('PENDING')) return 'warning';
      if (t.includes('CONFIRMED') || t.includes('COMPLETED')) return 'success';
      return 'info';
    })();

    if ((n.type || '').toUpperCase() === 'BOOKING_CREATED') {
      import('@/stores/alert').then(({ useAlertStore }) => {
        useAlertStore.getState().setNewBooking({
          title: n.title || 'New Booking Request',
          body: n.body || 'A new booking just arrived.',
          bookingNumber: n.data?.bookingNumber,
        });
      });
    }

    toast.addToast({
      type: variant,
      title: n.title || 'New activity',
      message: n.body,
      duration: 7000,
    });

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['queue'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  // ─────────────────────────── FCM ───────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function setupPush() {
      try {
        if (!('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = await getFirebaseMessaging();
        if (!messaging || cancelled) {
          if (!messaging) console.warn('Push notifications not supported on this browser.');
          return;
        }

        if (registration.active) {
          registration.active.postMessage({
            type: 'INIT_FIREBASE',
            config: {
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
      if (shopId) {
        socket.emit('joinShop', shopId);
      }
    });

    socket.on('notification', (payload: IncomingNotification) => {
      handlerRef.current(payload);
    });

    // The backend also emits booking_new directly to the shop room.
    // Surface those too so a fully-staff dashboard reacts even if the
    // notification row hasn't propagated yet.
    socket.on('booking_new', (payload: any) => {
      handlerRef.current({
        title: 'New booking request',
        body: payload?.customerName
          ? `${payload.customerName} requested a slot — booking #${payload.bookingNumber || ''}`.trim()
          : 'A new booking request just arrived.',
        type: 'BOOKING_CREATED',
        data: payload,
      });
    });

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, shopId]);
}
