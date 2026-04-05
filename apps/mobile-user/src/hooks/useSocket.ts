import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../api/socket';

/**
 * Global socket connection hook for real-time notifications
 */
export const useSocket = () => {
  const { user, token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user && token) {
      console.log('Initiating Socket.io connection...');
      socketService.connect(token, user.id);
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, user, token]);
};

/**
 * Hook for specific event listeners (e.g. notifications)
 */
export const useSocketEvent = <T>(event: string, callback: (data: T) => void) => {
  useEffect(() => {
    socketService.on(event, callback);
    return () => {
      socketService.off(event);
    };
  }, [event, callback]);
};
