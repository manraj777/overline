import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class QueueTrackingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Get trackable bookings for a shop (current or next, starting in <= 20 mins)
   */
  async getTrackableBookings(shopId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const limitDate = new Date(now.getTime() + 20 * 60000);

    // Get bookings that are pending/confirmed, for today, start <= 20 mins OR in progress
    const bookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        OR: [
          {
            status: { in: ['CONFIRMED', 'PENDING'] },
            startTime: { gte: startOfDay, lte: limitDate },
          },
          {
            status: 'IN_PROGRESS',
            startTime: { gte: startOfDay },
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        services: {
          select: { serviceName: true },
        },
        payment: {
          select: { status: true, amount: true, currency: true },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 2, // Limit to current and next person
    });

    // Decorate with real-time location from Redis
    const trackingData = await Promise.all(
      bookings.map(async (booking) => {
        const locationJson = await this.redis.getJson<{ lat: number; lng: number }>(
          `booking:${booking.id}:location`,
        );
        return {
          ...booking,
          location: locationJson || null,
        };
      }),
    );

    return trackingData;
  }

  /**
   * Save user's real-time location
   */
  async saveLocation(bookingId: string, location: { lat: number; lng: number }) {
    await this.redis.setJson(`booking:${bookingId}:location`, location, 1800); // 30 mins TTL
  }

  /**
   * Get chat messages for a booking
   */
  async getMessages(bookingId: string) {
    return this.prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Post a new message
   */
  async createMessage(
    bookingId: string,
    senderId: string,
    senderType: 'USER' | 'SHOP',
    content: string,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        bookingId,
        senderId,
        senderType,
        content,
      },
    });
  }

  async getMessagesBySessionId(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessageBySessionId(
    sessionId: string,
    senderId: string,
    senderType: 'USER' | 'SHOP',
    content: string,
  ) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, bookingId: true },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        bookingId: session.bookingId,
        senderId,
        senderType,
        senderRole: senderType === 'SHOP' ? 'STAFF' : 'USER',
        content,
      },
    });
  }
}
