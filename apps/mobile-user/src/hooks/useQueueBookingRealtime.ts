import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from '../api/client';

interface QueueBookingRealtimeOptions {
  bookingId?: string | null;
  onBookingUpdate?: (payload: any) => void;
}

export function useQueueBookingRealtime(options: QueueBookingRealtimeOptions) {
  const { bookingId, onBookingUpdate } = options;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setConnected(false);
      return;
    }

    const baseUrl = String(api.defaults.baseURL || '');
    const socketOrigin = baseUrl.replace(/\/api\/v1\/?$/, '');

    const anyClient = require('socket.io-client');
    const socketFactory =
      anyClient.io ||
      anyClient.default?.io ||
      anyClient.default?.default ||
      anyClient.default ||
      anyClient;

    if (typeof socketFactory !== 'function') {
      setConnected(false);
      return;
    }

    const socket: Socket = socketFactory(`${socketOrigin}/queue`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log(`[User Socket] Joined /queue room for booking ${bookingId}`);
      socket.emit('trackBooking', { bookingId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('bookingUpdate', payload => {
      console.log('[User Socket] Received bookingUpdate:', payload);
      if (onBookingUpdate) {
        onBookingUpdate(payload);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId, onBookingUpdate]);

  return { connected };
}
