import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from './bookings.service';
import { BookingStatus, NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class PendingApprovalCron {
  private readonly logger = new Logger(PendingApprovalCron.name);
  
  // 15 minutes timeout for abandoned checkouts
  private readonly TIMEOUT_MS = 15 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePendingApprovals() {
    this.logger.debug('Running Abandoned Booking check job...');
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.TIMEOUT_MS);

    try {
      // Find bookings that have been stuck in PENDING_APPROVAL for more than 15 minutes.
      // This happens when users drop off during the Razorpay payment gateway screen.
      const abandonedBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING_APPROVAL,
          createdAt: {
            lt: cutoffTime,
          },
        },
        include: {
          shop: { select: { id: true, name: true, ownerId: true } },
          user: { select: { id: true, name: true } },
        },
      });

      if (abandonedBookings.length === 0) return;

      for (const booking of abandonedBookings) {
        this.logger.log(`Cancelling abandoned booking ${booking.bookingNumber} at shop ${booking.shop.name}`);

        // Automatically cancel the booking. This correctly calls BookingsService.updateStatus
        // which will unmark the Redis slot locks, freeing the slot for other users!
        await this.bookingsService.cancel(booking.id);

        if (booking.userId) {
          await this.notificationsService.send({
            userId: booking.userId,
            bookingId: booking.id,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Booking Cancelled',
            body: `Your booking at ${booking.shop.name} was cancelled because payment was not completed.`,
            data: { bookingNumber: booking.bookingNumber },
            channels: [NotificationChannel.PUSH],
          });
        }
      }
    } catch (error) {
      this.logger.error('Error executing Abandoned Booking cron job', error);
    }
  }
}
