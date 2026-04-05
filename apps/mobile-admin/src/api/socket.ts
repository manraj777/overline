import { io, Socket } from 'socket.io-client';
import { Config } from '../config';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(token: string, userId: string) {
    if (this.socket?.connected && this.userId === userId) return;

    this.userId = userId;
    this.socket = io(`${Config.API_URL}/events`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Admin Socket.io connected');
      this.socket?.emit('authenticate');
    });

    this.socket.on('disconnect', () => {
      console.log('Admin Socket.io disconnected');
    });
  }

  joinShop(shopId: string) {
    if (this.socket?.connected) {
      this.socket.emit('joinShop', shopId);
      console.log(`Joined shop room: ${shopId}`);
    }
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
}

export const socketService = new SocketService();
