import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SlotEngineService } from './slot-engine.service';

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
    const upcoming = bookings.filter((b) => 
      ['PENDING', 'CONFIRMED'].includes(b.status) && b.startTime > now
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
   * Invalidate slot cache when bookings change
   */
  async invalidateSlotCache(shopId: string, date?: Date): Promise<void> {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    await this.redis.invalidateSlots(shopId, dateStr);
  }
}
