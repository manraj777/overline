import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

interface QueueUpdate {
  shopId: string;
  stats: any;
  queue: any;
  timestamp: string;
}

interface UseQueueSocketOptions {
  shopId?: string;
  onQueueUpdate?: (update: QueueUpdate) => void;
  onBookingUpdate?: (update: any) => void;
  enabled?: boolean;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const backendUrl =
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    '';
  if (backendUrl) return backendUrl;
  return window.location.origin;
}

export function useQueueSocket({
  shopId,
  onQueueUpdate,
  onBookingUpdate,
  enabled = true,
}: UseQueueSocketOptions) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled || !shopId || typeof window === 'undefined') return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const socket = io(`${wsUrl}/queue`, {
      transports: ['websocket', 'polling'],
      auth: accessToken ? { token: accessToken } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinShopQueue', { shopId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('queueUpdate', (data: QueueUpdate) => {
      onQueueUpdate?.(data);
    });

    socket.on('bookingUpdate', (data: any) => {
      onBookingUpdate?.(data);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leaveShopQueue', { shopId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, shopId, onQueueUpdate, onBookingUpdate, accessToken]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { connected, socket: socketRef.current };
}
