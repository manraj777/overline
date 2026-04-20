import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';
import { QueueTrackingService } from './queue-tracking.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/queue',
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QueueGateway.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly queueTrackingService: QueueTrackingService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client subscribes to queue updates for a specific shop
   */
  @SubscribeMessage('joinShopQueue')
  handleJoinShopQueue(@ConnectedSocket() client: Socket, @MessageBody() data: { shopId: string }) {
    const room = `shop:${data.shopId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', room };
  }

  /**
   * Client unsubscribes from a shop queue
   */
  @SubscribeMessage('leaveShopQueue')
  handleLeaveShopQueue(@ConnectedSocket() client: Socket, @MessageBody() data: { shopId: string }) {
    const room = `shop:${data.shopId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    return { event: 'left', room };
  }

  /**
   * Client subscribes to updates for their specific booking
   */
  @SubscribeMessage('trackBooking')
  handleTrackBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    const room = `booking:${data.bookingId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} tracking booking ${data.bookingId}`);
    return { event: 'tracking', room };
  }

  /**
   * User emits live location updates
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string; lat: number; lng: number },
  ) {
    if (!data.bookingId || !data.lat || !data.lng) return;

    // Save to Redis (TTL 30 mins)
    await this.queueTrackingService.saveLocation(data.bookingId, { lat: data.lat, lng: data.lng });

    // Broadcast to everyone in the booking room (such as the admin)
    this.server.to(`booking:${data.bookingId}`).emit('locationUpdate', {
      bookingId: data.bookingId,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Chat messages between user and owner
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { bookingId: string; senderId: string; senderType: 'USER' | 'SHOP'; content: string },
  ) {
    if (!data.bookingId || !data.content) return;

    const msg = await this.queueTrackingService.createMessage(
      data.bookingId,
      data.senderId,
      data.senderType,
      data.content,
    );

    this.server.to(`booking:${data.bookingId}`).emit('chatMessage', msg);
  }

  /**
   * Emit queue stats update to all clients watching a shop
   */
  async emitQueueUpdate(shopId: string) {
    try {
      const [stats, todayQueue] = await Promise.all([
        this.queueService.getQueueStats(shopId),
        this.queueService.getTodayQueue(shopId),
      ]);

      this.server.to(`shop:${shopId}`).emit('queueUpdate', {
        shopId,
        stats,
        queue: todayQueue,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to emit queue update for shop ${shopId}`, error);
    }
  }

  /**
   * Emit booking status change to clients tracking that booking
   */
  emitBookingUpdate(bookingId: string, update: any) {
    this.server.to(`booking:${bookingId}`).emit('bookingUpdate', {
      bookingId,
      ...update,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit queue position update for a specific booking
   */
  emitPositionUpdate(bookingId: string, position: number) {
    this.server.to(`booking:${bookingId}`).emit('positionUpdate', {
      bookingId,
      position,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit waitlist offer lifecycle updates for a booking.
   */
  emitSlotOfferUpdate(bookingId: string, update: any) {
    this.server.to(`booking:${bookingId}`).emit('slotOfferUpdate', {
      bookingId,
      ...update,
      timestamp: new Date().toISOString(),
    });
  }
}
