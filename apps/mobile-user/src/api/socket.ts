import { io, Socket } from 'socket.io-client';
import { Config } from '../config';
import { useAuthStore } from '../stores/authStore';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(token: string, userId: string) {
    if (this.socket?.connected && this.userId === userId) return;

    this.userId = userId;
    this.socket = io(`${Config.WS_URL}/events`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket.io connected (Events Namespace)');
      this.socket?.emit('authenticate'); // Additional verification
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
