import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SlotEngineService } from './slot-engine.service';
import { BookingSource, BookingStatus, ServiceStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private slotEngine: SlotEngineService,
  ) {}

  /**
   * Update queue statistics for a shop
   */
  async updateQueueStats(shopId: string): Promise<void> {
    const now = new Date();

    // Count waiting bookings
    const waitingCount = await this.prisma.booking.count({
      where: {
        shopId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { gte: now },
      },
    });

    // Calculate estimated wait time
    const estimatedWaitMinutes = await this.slotEngine.calculateWaitTime(shopId);

    // Get next available slot
    const avgService = await this.prisma.service.findFirst({
      where: { shopId, isActive: true },
      orderBy: { durationMinutes: 'asc' },
    });

    let nextSlot: string | undefined;
    if (avgService) {
      const next = await this.slotEngine.getNextAvailableSlot(shopId, [avgService.id]);
      nextSlot = next?.startTime;
    }

    // Update Redis cache
    await this.redis.updateShopQueueStats(shopId, {
      waitingCount,
      estimatedWaitMinutes,
      nextSlot,
    });

    // Also update database for persistence
    await this.prisma.queueStats.upsert({
      where: { shopId },
      update: {
        currentWaitingCount: waitingCount,
        estimatedWaitMinutes,
        nextAvailableSlot: nextSlot ? new Date(nextSlot) : null,
        lastUpdatedAt: now,
      },
      create: {
        shopId,
        currentWaitingCount: waitingCount,
        estimatedWaitMinutes,
        nextAvailableSlot: nextSlot ? new Date(nextSlot) : null,
      },
    });
  }

  private generateBookingNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().slice(0, 4).toUpperCase();
    return `OL-${timestamp}-${random}`;
  }

  private generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Get queue position for a booking
   */
  async getQueuePosition(bookingId: string): Promise<number> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return -1;
    }

    // Count bookings before this one (same day, same shop)
    const startOfDay = new Date(booking.startTime);
    startOfDay.setHours(0, 0, 0, 0);

    const position = await this.prisma.booking.count({
      where: {
        shopId: booking.shopId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        startTime: { lt: booking.startTime, gte: startOfDay },
      },
    });

    return position + 1;
  }

  /**
   * Get next queue position for a shop (today only)
   */
  async getNextQueuePosition(shopId: string): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const activeCount = await this.prisma.booking.count({
      where: {
        shopId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        startTime: { gte: startOfDay },
      },
    });

    return activeCount + 1;
  }

  /**
   * Create a walk-in queue booking.
   */
  async joinQueue(params: {
    shopId: string;
    userId?: string;
    customerName?: string;
    customerPhone?: string;
    serviceId?: string;
  }) {
    const { shopId, userId, customerName, customerPhone, serviceId } = params;

    const [shop, activeService] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.service.findFirst({
        where: {
          shopId,
          id: serviceId,
          isActive: true,
        },
      }),
    ]);

    if (!shop) {
      throw new Error('Shop not found');
    }

    const fallbackService =
      activeService ||
      (await this.prisma.service.findFirst({
        where: { shopId, isActive: true },
        orderBy: { durationMinutes: 'asc' },
      }));

    if (!fallbackService) {
      throw new Error('No active services found for shop');
    }

    const queuePosition = await this.getNextQueuePosition(shopId);
    const bookingStart = new Date();
    bookingStart.setMinutes(
      bookingStart.getMinutes() + (queuePosition - 1) * fallbackService.durationMinutes,
    );
    const bookingEnd = new Date(
      bookingStart.getTime() + fallbackService.durationMinutes * 60 * 1000,
    );

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber: this.generateBookingNumber(),
        userId,
        shopId,
        startTime: bookingStart,
        endTime: bookingEnd,
        totalDurationMinutes: fallbackService.durationMinutes,
        totalAmount: fallbackService.price,
        serviceAmount: fallbackService.price,
        freeCashAmount: 0,
        displayAmount: fallbackService.price,
        verificationCode: this.generateVerificationCode(),
        serviceStatus: ServiceStatus.AWAITING_CODE,
        paymentType: 'PAY_LATER',
        status: BookingStatus.PENDING,
        source: BookingSource.WALK_IN,
        customerName: userId ? undefined : customerName,
        customerPhone: userId ? undefined : customerPhone,
        queuePosition,
        services: {
          create: [
            {
              serviceId: fallbackService.id,
              serviceName: fallbackService.name,
              durationMinutes: fallbackService.durationMinutes,
              price: fallbackService.price,
            },
          ],
        },
      },
      include: {
        services: true,
      },
    });

    await this.updateQueueStats(shopId);
    return booking;
  }

  async callNextCustomer(shopId: string, _staffId?: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const nextBooking = await this.prisma.booking.findFirst({
      where: {
        shopId,
        startTime: { gte: startOfDay },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
      orderBy: [{ queuePosition: 'asc' }, { startTime: 'asc' }],
    });

    if (!nextBooking) {
      throw new Error('No waiting customer in queue');
    }

    const updated = await this.prisma.booking.update({
      where: { id: nextBooking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        serviceStatus: ServiceStatus.AWAITING_CODE,
      },
    });

    await this.updateQueueStats(shopId);
    return updated;
  }

  async markCheckedIn(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        arrivedAt: new Date(),
        status: booking.status === BookingStatus.PENDING ? BookingStatus.CONFIRMED : booking.status,
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async startService(bookingId: string, verificationCode: string, staffId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.verificationCode || booking.verificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    const now = new Date();
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        serviceStatus: ServiceStatus.IN_SERVICE,
        startedAt: now,
        arrivedAt: booking.arrivedAt || now,
        codeVerifiedBy: staffId,
        codeVerifiedAt: now,
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async markServiceDone(bookingId: string, _staffId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        serviceStatus: ServiceStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async removeFromQueue(bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        adminNotes: reason,
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  /**
   * Get today's queue for a shop
   */
  async getTodayQueue(shopId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            // Trust Score fields for admin dashboard warnings
            trustScore: true,
            noShowBookings: true,
            totalBookings: true,
          },
        },
        services: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Group by status
    const upcoming = bookings.filter(
      (b) => ['PENDING', 'CONFIRMED'].includes(b.status) && b.startTime > now,
    );
    const inProgress = bookings.filter((b) => b.status === 'IN_PROGRESS');
    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const noShow = bookings.filter((b) => b.status === 'NO_SHOW');

    return {
      upcoming,
      inProgress,
      completed,
      noShow,
      stats: {
        total: bookings.length,
        upcomingCount: upcoming.length,
        inProgressCount: inProgress.length,
        completedCount: completed.length,
        noShowCount: noShow.length,
      },
    };
  }

  /**
   * Get queue stats for a shop (from Redis or DB)
   */
  async getQueueStats(shopId: string) {
    // Try Redis first
    const cached = await this.redis.getShopQueueStats(shopId);
    if (cached) return cached;

    // Fall back to DB
    const dbStats = await this.prisma.queueStats.findUnique({
      where: { shopId },
    });

    if (dbStats) {
      return {
        waitingCount: dbStats.currentWaitingCount,
        estimatedWaitMinutes: dbStats.estimatedWaitMinutes,
        nextSlot: dbStats.nextAvailableSlot?.toISOString() || null,
      };
    }

    return { waitingCount: 0, estimatedWaitMinutes: 0, nextSlot: null };
  }

  /**
   * Invalidate slot cache when bookings change
   */
  async invalidateSlotCache(shopId: string, date?: Date): Promise<void> {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    await this.redis.invalidateSlots(shopId, dateStr);
  }
}
