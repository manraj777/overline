import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';

export interface NotificationPayload {
  userId: string;
  bookingId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Send notification to user
   */
  async send(payload: NotificationPayload): Promise<void> {
    const { userId, bookingId, type, title, body, data, channels } = payload;

    // Create notification records for each channel
    const notifications = await Promise.all(
      channels.map((channel) =>
        this.prisma.notification.create({
          data: {
            userId,
            bookingId,
            channel,
            type,
            title,
            body,
            data: data || {},
            status: NotificationStatus.PENDING,
          },
        }),
      ),
    );

    // Send through each channel (async, don't await)
    notifications.forEach((notification) => {
      this.sendThroughChannel(notification).catch((error) => {
        console.error(`Failed to send ${notification.channel} notification:`, error);
      });
    });
  }

  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmation(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
        services: true,
      },
    });

    if (!booking || !booking.user) return;

    await this.send({
      userId: booking.user.id,
      bookingId: booking.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Booking Confirmed!',
      body: `Your appointment at ${booking.shop.name} on ${booking.startTime.toLocaleDateString()} at ${booking.startTime.toLocaleTimeString()} has been confirmed.`,
      data: {
        bookingNumber: booking.bookingNumber,
        shopName: booking.shop.name,
        startTime: booking.startTime.toISOString(),
      },
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    });
  }

  /**
   * Send booking reminder
   */
  async sendBookingReminder(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking || !booking.user) return;

    await this.send({
      userId: booking.user.id,
      bookingId: booking.id,
      type: NotificationType.BOOKING_REMINDER,
      title: 'Appointment Reminder',
      body: `Your appointment at ${booking.shop.name} is coming up in 1 hour.`,
      data: {
        bookingNumber: booking.bookingNumber,
        shopName: booking.shop.name,
        startTime: booking.startTime.toISOString(),
        address: booking.shop.address,
      },
      channels: [NotificationChannel.PUSH],
    });
  }

  /**
   * Send queue update notification
   */
  async sendQueueUpdate(bookingId: string, position: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking || !booking.user) return;

    let body: string;
    let type: NotificationType;

    if (position === 0) {
      type = NotificationType.TURN_NOTIFICATION;
      body = `It's your turn! Please proceed to ${booking.shop.name}.`;
    } else {
      type = NotificationType.QUEUE_UPDATE;
      body = `${position} ${position === 1 ? 'person' : 'people'} ahead of you at ${booking.shop.name}.`;
    }

    await this.send({
      userId: booking.user.id,
      bookingId: booking.id,
      type,
      title: position === 0 ? "It's Your Turn!" : 'Queue Update',
      body,
      data: {
        position,
        bookingNumber: booking.bookingNumber,
      },
      channels: [NotificationChannel.PUSH],
    });
  }

  /**
   * Internal: Send through specific channel
   */
  private async sendThroughChannel(notification: any): Promise<void> {
    try {
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(notification);
          break;
      }

      // Mark as sent
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      // Mark as failed
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          data: {
            ...notification.data,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
      throw error;
    }
  }

  private async sendEmail(notification: any): Promise<void> {
    const apiKey = this.configService.get('notifications.sendgrid.apiKey');
    if (!apiKey) {
      console.log('SendGrid not configured, skipping email');
      return;
    }

    // Get user email
    const user = await this.prisma.user.findUnique({
      where: { id: notification.userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    // In production, use SendGrid SDK
    console.log(`[EMAIL] To: ${user.email}, Subject: ${notification.title}`);
  }

  private async sendPush(notification: any): Promise<void> {
    const fcmKey = this.configService.get('notifications.fcm.serverKey');
    if (!fcmKey) {
      console.log('FCM not configured, skipping push notification');
      return;
    }

    // In production, use Firebase Admin SDK
    console.log(`[PUSH] To: ${notification.userId}, Title: ${notification.title}`);
  }

  private async sendSms(notification: any): Promise<void> {
    const smsKey = this.configService.get('notifications.sms.apiKey');
    if (!smsKey) {
      console.log('SMS not configured, skipping SMS');
      return;
    }

    // Get user phone
    const user = await this.prisma.user.findUnique({
      where: { id: notification.userId },
      select: { phone: true },
    });

    if (!user?.phone) return;

    // In production, use SMS provider SDK
    console.log(`[SMS] To: ${user.phone}, Body: ${notification.body}`);
  }
}
