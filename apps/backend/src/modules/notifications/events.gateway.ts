import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId
  private shopRooms = new Map<string, Set<string>>(); // shopId -> Set<socketId>

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Cleanup mappings
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @CurrentUser('id') userId: string,
  ) {
    this.userSockets.set(userId, client.id);
    this.logger.log(`User ${userId} authenticated on socket ${client.id}`);
    return { status: 'authenticated' };
  }

  @SubscribeMessage('joinShop')
  async handleJoinShop(
    @ConnectedSocket() client: Socket,
    @MessageBody() shopId: string,
  ) {
    client.join(`shop:${shopId}`);
    this.logger.log(`Client ${client.id} joined shop room: shop:${shopId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('trackBooking')
  async handleTrackBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { bookingId: string }
  ) {
    if (!payload?.bookingId) return;
    const room = `booking:${payload.bookingId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} tracking booking ${payload.bookingId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { bookingId: string; text: string },
    @CurrentUser('id') userId: string,
  ) {
    if (!payload?.bookingId || !payload?.text) return;
    
    // In a full implementation, you would save this to the database's ChatMessage table.
    // For now, we broadcast it in real-time to the booking room.
    const message = {
      id: Math.random().toString(36).substring(7),
      text: payload.text,
      senderId: userId,
      createdAt: new Date().toISOString(),
    };

    // Broadcast to everyone tracking this booking
    this.server.to(`booking:${payload.bookingId}`).emit('chatMessage', message);
  }

  // Helper method to send to a specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Helper method to send to a shop (e.g. for staff/owners)
  sendToShop(shopId: string, event: string, data: any) {
    this.server.to(`shop:${shopId}`).emit(event, data);
  }
}
