import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from './bookings.service';
import { BookingStatus, NotificationType, NotificationChannel } from '@prisma/client';

/**
 * Auto-expire bookings that the shop never responded to.
 *
 * IMPORTANT: PENDING_APPROVAL now means "awaiting staff approval" (the
 * normal state every booking sits in until the shop confirms or rejects).
 * It does NOT mean "checkout in progress". Therefore we must NOT cancel
 * a booking just because it is N minutes old — a slot booked for tomorrow
 * is supposed to stay PENDING_APPROVAL all day.
 *
 * The only correct "expire" rule is: the slot's startTime has come and
 * gone with no staff action. At that point the slot has been wasted and
 * we mark the booking REJECTED with an auto-expire note so the user can
 * rebook elsewhere.
 */
@Injectable()
export class PendingApprovalCron {
  private readonly logger = new Logger(PendingApprovalCron.name);

  // Small grace window after startTime to account for clock skew between
  // client, server and DB. 2 minutes is enough.
  private readonly GRACE_PERIOD_MS = 2 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePendingApprovals() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.GRACE_PERIOD_MS);

    try {
      // Bookings the shop never approved before the slot started.
      const expiredBookings = await this.prisma.booking.findMany({
        where: {
          status: { in: [BookingStatus.PENDING_APPROVAL, BookingStatus.PENDING] },
          startTime: { lt: cutoff },
        },
        include: {
          shop: { select: { id: true, name: true, ownerId: true } },
          user: { select: { id: true, name: true } },
        },
      });

      if (expiredBookings.length === 0) return;

      this.logger.log(
        `Auto-expiring ${expiredBookings.length} unresponded booking(s) whose slot has passed.`,
      );

      for (const booking of expiredBookings) {
        try {
          // Move to REJECTED via the booking service so slot locks, queue
          // stats, websockets and trust score side-effects all run.
          await this.bookingsService.updateStatus(booking.id, BookingStatus.REJECTED);
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              adminNotes: 'AUTO_EXPIRED_NO_RESPONSE',
              cancellationReason: 'OTHER',
              cancellationDetails: 'Auto-expired: shop did not respond before slot started.',
            },
          });

          this.logger.log(
            `Booking ${booking.bookingNumber} auto-expired (shop did not respond before slot start).`,
          );

          if (booking.userId) {
            await this.notificationsService.send({
              userId: booking.userId,
              bookingId: booking.id,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Booking Expired',
              body: `${booking.shop.name} did not respond to your booking in time. The slot has been released — feel free to rebook.`,
              data: { bookingNumber: booking.bookingNumber },
              channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
            });
          }
        } catch (innerErr) {
          this.logger.error(
            `Failed to auto-expire booking ${booking.id}: ${(innerErr as Error)?.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error executing booking expiry cron job', error);
    }
  }
}
