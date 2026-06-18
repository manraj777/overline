import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BookingStatus, NotificationType, NotificationChannel } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StaleQueueCronService {
  private readonly logger = new Logger(StaleQueueCronService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStaleQueueWarning() {
    this.logger.debug('Running stale queue warning cron...');
    
    // Find IN_PROGRESS bookings where the elapsed time is > totalDurationMinutes + 30
    const inProgressBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.IN_PROGRESS,
        startedAt: { not: null },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        user: true,
        shop: true,
      },
    });

    const now = new Date();

    for (const booking of inProgressBookings) {
      if (!booking.startedAt) continue;

      const totalDuration = booking.services.reduce((acc, curr) => acc + curr.service.durationMinutes, 0);
      const elapsedMinutes = (now.getTime() - booking.startedAt.getTime()) / (1000 * 60);

      // If they've been in the chair 30 minutes longer than the service was supposed to take
      if (elapsedMinutes > totalDuration + 30) {
        // Find owner or staff who can receive a notification
        const shopOwnerId = booking.shop.ownerId;
        
        await this.notificationsService.send({
          userId: shopOwnerId,
          bookingId: booking.id,
          type: NotificationType.QUEUE_UPDATE,
          title: `Stale Queue Warning: Is ${booking.customerName || booking.user?.name || 'the customer'} still in the chair?`,
          body: `This booking has been active for ${Math.floor(elapsedMinutes)} mins (expected: ${totalDuration} mins). Please complete or cancel it to keep the queue accurate.`,
          data: {
            bookingId: booking.id,
            shopId: booking.shopId,
          },
          channels: [NotificationChannel.PUSH],
        });
      }
    }
  }
}
