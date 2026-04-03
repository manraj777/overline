import {useEffect, useState} from 'react';
import type {Socket} from 'socket.io-client';
import apiClient from '../api/client';

interface QueueRealtimeOptions {
  shopId?: string | null;
  onQueueUpdate?: (payload: any) => void;
}

export function useQueueRealtime(options: QueueRealtimeOptions) {
  const {shopId, onQueueUpdate} = options;
  const [connected, setConnected] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!shopId) {
      setConnected(false);
      return;
    }

    const baseUrl = String(apiClient.defaults.baseURL || '');
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
      socket.emit('joinShopQueue', {shopId});
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('queueUpdate', payload => {
      setLastUpdatedAt(Date.now());
      if (onQueueUpdate) {
        onQueueUpdate(payload);
      }
    });

    return () => {
      socket.emit('leaveShopQueue', {shopId});
      socket.disconnect();
    };
  }, [shopId, onQueueUpdate]);

  return {
    connected,
    lastUpdatedAt,
  };
}
