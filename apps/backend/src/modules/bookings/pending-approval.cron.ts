import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingStatus, NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class PendingApprovalCron {
  private readonly logger = new Logger(PendingApprovalCron.name);
  
  // 10 minutes timeout
  private readonly TIMEOUT_MS = 10 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePendingApprovals() {
    this.logger.debug('Running Pending Approval check job...');
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.TIMEOUT_MS);

    try {
      // Find bookings that have been PENDING for more than 10 minutes
      // and haven't had a reminder sent yet (we track this by checking existing notifications)
      const pendingBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING,
          createdAt: {
            lt: cutoffTime,
          },
        },
        include: {
          shop: { select: { id: true, name: true, ownerId: true } },
          user: { select: { id: true, name: true } },
        },
      });

      if (pendingBookings.length === 0) return;

      for (const booking of pendingBookings) {
        // Check if we already sent a reminder for this booking
        const existingReminder = await this.prisma.notification.findFirst({
          where: {
            bookingId: booking.id,
            title: 'Action Required: Pending Booking',
          },
        });

        if (existingReminder) continue;

        this.logger.log(`Sending approval reminder for booking ${booking.bookingNumber} at shop ${booking.shop.name}`);

        // Notify the Shop Owner
        await this.notificationsService.send({
          userId: booking.shop.ownerId,
          bookingId: booking.id,
          type: NotificationType.SYSTEM_ALERT,
          title: 'Action Required: Pending Booking',
          body: `Booking ${booking.bookingNumber} has been pending for over 10 minutes. Please approve or propose a new time.`,
          data: { bookingNumber: booking.bookingNumber, shopId: booking.shopId },
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        });

        // Notify the User
        if (booking.userId) {
          await this.notificationsService.send({
            userId: booking.userId,
            bookingId: booking.id,
            type: NotificationType.BOOKING_UPDATE,
            title: 'Booking Under Review',
            body: `Your booking at ${booking.shop.name} is being reviewed by the staff. It might take a few more minutes.`,
            data: { bookingNumber: booking.bookingNumber },
            channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          });
        }
      }
    } catch (error) {
      this.logger.error('Error executing Pending Approval cron job', error);
    }
  }
}
