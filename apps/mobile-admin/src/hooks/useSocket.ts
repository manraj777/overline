import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../api/socket';

/**
 * Global socket connection hook for shop administrators
 */
export const useSocket = () => {
  const { user, token, isAuthenticated, selectedShopId } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user && token) {
      console.log('Initiating Admin Socket.io connection...');
      socketService.connect(token, user.id);
      
      if (selectedShopId) {
        socketService.joinShop(selectedShopId);
      }
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, user, token, selectedShopId]);
};

/**
 * Hook for specific admin events (e.g. new bookings)
 */
export const useSocketEvent = <T>(event: string, callback: (data: T) => void) => {
  useEffect(() => {
    socketService.on(event, callback);
    return () => {
      socketService.off(event);
    };
  }, [event, callback]);
};
