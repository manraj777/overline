import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';

export interface NotificationPayload {
  userId?: string;
  bookingId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  // For guest bookings
  email?: string;
  phone?: string;
}

import { EventsGateway } from './events.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private sendgridEnabled = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventsGateway: EventsGateway,
  ) {
    // Initialize SendGrid
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      this.sendgridEnabled = true;
      this.logger.log('SendGrid email enabled');
    }
  }

  /**
   * Send notification to user.
   *
   * Creates a SINGLE in-app notification row and dispatches every requested
   * channel (email, sms, push) off that row. Previously a separate row was
   * written per channel which caused 3–4x duplicate entries in the user's
   * notifications list after a single booking.
   */
  async send(payload: NotificationPayload): Promise<void> {
    const { userId, bookingId, type, title, body, data, channels, email, phone } = payload;

    if (!userId) {
      // Guest booking — deliver through the transport channels directly
      // without persisting a row (no user to attach it to).
      if (channels.includes(NotificationChannel.EMAIL) && email) {
        await this.sendEmail(email, title, body);
      }
      if (channels.includes(NotificationChannel.SMS) && phone) {
        await this.sendSms(phone, body);
      }
      return;
    }

    // Persist ONE representative row — prefer PUSH as the channel tag because
    // it is the primary transport for the in-app notifications tray. Any of
    // EMAIL / SMS / PUSH is acceptable; the row itself represents "the user
    // was notified" regardless of transport.
    const primaryChannel =
      (channels.includes(NotificationChannel.PUSH) && NotificationChannel.PUSH) ||
      (channels.includes(NotificationChannel.EMAIL) && NotificationChannel.EMAIL) ||
      (channels.includes(NotificationChannel.SMS) && NotificationChannel.SMS) ||
      NotificationChannel.PUSH;

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        bookingId,
        channel: primaryChannel,
        type,
        title,
        body,
        data: data || {},
        status: NotificationStatus.PENDING,
      },
    });

    // Fan out every requested transport from the single row.
    const deliveryResults = await Promise.allSettled(
      channels.map((channel) =>
        this.deliverChannel(channel, notification, email, phone),
      ),
    );

    // Mark as SENT if at least one transport succeeded, else FAILED.
    const anySent = deliveryResults.some((r) => r.status === 'fulfilled');
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: anySent ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: anySent ? new Date() : undefined,
      },
    });
  }

  /**
   * Dispatch a single channel for a persisted notification. Does NOT write
   * additional DB rows — status for the single representative row is
   * managed by `send()` above.
   */
  private async deliverChannel(
    channel: NotificationChannel,
    notification: any,
    email?: string,
    phone?: string,
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL: {
        const userEmail = email || (await this.getUserEmail(notification.userId));
        if (userEmail) {
          await this.sendEmail(userEmail, notification.title, notification.body);
        }
        return;
      }
      case NotificationChannel.SMS: {
        const userPhone = phone || (await this.getUserPhone(notification.userId));
        if (userPhone) {
          await this.sendSms(userPhone, notification.body);
        }
        return;
      }
      case NotificationChannel.PUSH: {
        if (notification.userId) {
          // Send real-time notification via Socket.io
          this.eventsGateway.sendToUser(notification.userId, 'notification', {
            id: notification.id,
            title: notification.title,
            body: notification.body,
            type: notification.type,
            data: notification.data,
          });
          this.logger.log(`Real-time PUSH (Socket.io) sent to User: ${notification.userId}`);

          // Send FCM Push Notification
          try {
            const fcmToken = await this.getUserFcmToken(notification.userId);
            if (fcmToken) {
              const admin = require('firebase-admin');
              if (admin.apps.length > 0) {
                await admin.messaging().send({
                  token: fcmToken,
                  notification: {
                    title: notification.title,
                    body: notification.body,
                  },
                  android: {
                    priority: 'high',
                    notification: {
                      sound: 'default',
                      channelId: 'overline_alerts',
                    },
                  },
                  apns: {
                    payload: {
                      aps: {
                        sound: 'default',
                        badge: 1,
                      },
                    },
                  },
                  webpush: {
                    headers: {
                      Urgency: 'high',
                    },
                    notification: {
                      requireInteraction: true,
                      icon: '/overline-logo.png',
                      badge: '/favicon.ico',
                      sound: '/sounds/notification.mp3',
                      tag: 'overline-admin-alert',
                    },
                  },
                  data: {
                    // FCM only allows string values on `data`. Coerce
                    // explicitly so we never trip over null / number.
                    type: String(notification.type || ''),
                    id: String(notification.id || ''),
                    bookingId: String(notification.bookingId || ''),
                  },
                });
                this.logger.log(`FCM Push Notification sent to User: ${notification.userId}`);
              } else {
                this.logger.warn('FCM delivery skipped: Firebase Admin not initialized.');
              }
            }
          } catch (error) {
            this.logger.error(`Failed to send FCM to User: ${notification.userId}`, error);
          }
        }
        return;
      }
    }
  }

  /**
   * Get user FCM token
   */
  private async getUserFcmToken(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    return user?.fcmToken || null;
  }

  /**
   * Send email via SendGrid
   */
  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!this.sendgridEnabled) {
      this.logger.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
      return;
    }

    const fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@overline.in';

    try {
      await sgMail.send({
        to,
        from: fromEmail,
        subject,
        text,
        html: this.wrapInHtmlTemplate(subject, text),
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error('SendGrid error:', error);
      throw error;
    }
  }

  /**
   * Send SMS via n8n automation workflow
   * We trigger the local n8n container, which then handles WhatsApp delivery.
   */
  private async sendSms(to: string, body: string): Promise<void> {
    try {
      const axios = require('axios');
      // Replace with your actual n8n internal container URL / exposed port
      // If deployed via docker-compose, 'n8n' service is available internally.
      const n8nWebhookUrl = 'http://n8n:5678/webhook/queue-update';
      
      await axios.post(n8nWebhookUrl, {
        phoneNumber: to,
        message: body,
      });
      this.logger.log(`[n8n Triggered] Sent WhatsApp notification to ${to}`);
    } catch (error) {
      this.logger.error(`[n8n Webhook Error] Failed to send message to ${to}:`, error.message);
    }
  }

  /**
   * Wrap text in HTML email template
   */
  private wrapInHtmlTemplate(title: string, body: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Overline</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>${body}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Overline. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get user email
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || null;
  }

  /**
   * Get user phone
   */
  private async getUserPhone(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    return user?.phone || null;
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

    if (!booking) return;

    const startTime = new Date(booking.startTime);
    const dateStr = startTime.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    const timeStr = startTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    // Every new booking starts in PENDING_APPROVAL. Use "Placed" copy until
    // the shop actually confirms it. Separate "Confirmed" copy is sent when
    // status transitions to CONFIRMED.
    const isPending =
      booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING';
    const title = isPending ? 'Booking Placed! 🎉' : 'Booking Confirmed! ✅';

    // De-duplicate: Ensure we don't send the "Booking Placed!" or "Booking Confirmed!"
    // notification multiple times for the same booking.
    if (booking.userId) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: booking.userId,
          bookingId: booking.id,
          title: title,
        },
      });
      if (existing) {
        console.log(`[NotificationsService] Skipping duplicate ${title} info for booking ${booking.id}`);
        return;
      }
    }

    const headline = isPending
      ? `Your booking at ${booking.shop.name} has been placed and is waiting for shop approval.`
      : `Your booking at ${booking.shop.name} is confirmed!`;

    const message =
      `${headline}\n\n` +
      `📅 Date: ${dateStr}\n` +
      `⏰ Time: ${timeStr}\n` +
      `📍 Address: ${booking.shop.address}\n` +
      `🔢 Booking #: ${booking.bookingNumber}\n\n` +
      (isPending ? "We'll notify you as soon as the shop confirms." : 'See you soon!');

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title,
      body: message,
      data: {
        bookingNumber: booking.bookingNumber,
        shopName: booking.shop.name,
        startTime: booking.startTime.toISOString(),
        status: booking.status,
      },
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
      email: booking.customerEmail || undefined,
      phone: booking.customerPhone || undefined,
    });

    // Also broadcast specifically to the shop that a new booking arrived
    this.eventsGateway.sendToShop(booking.shopId, 'booking_new', {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: booking.user?.name || 'Guest',
      startTime: booking.startTime,
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

    if (!booking) return;

    const startTime = new Date(booking.startTime);
    const timeStr = startTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    const message =
      `Reminder: Your appointment at ${booking.shop.name} is in 1 hour at ${timeStr}.\n` +
      `📍 ${booking.shop.address}\n` +
      `Booking #: ${booking.bookingNumber}`;

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.BOOKING_REMINDER,
      title: 'Appointment Reminder ⏰',
      body: message,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      email: booking.customerEmail || undefined,
      phone: booking.customerPhone || undefined,
    });
  }

  /**
   * Send queue update (your turn is coming)
   */
  async sendQueueUpdate(bookingId: string, position: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking) return;

    let message: string;
    if (position === 1) {
      message = `🔔 It's almost your turn at ${booking.shop.name}! Please be ready.`;
    } else if (position <= 3) {
      message = `📢 ${position} people ahead of you at ${booking.shop.name}. Please arrive soon.`;
    } else {
      return; // Don't notify for positions > 3
    }

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.QUEUE_UPDATE,
      title: 'Queue Update',
      body: message,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      phone: booking.customerPhone || undefined,
    });

    // Emit live queue data if needed (mobile-user UI update)
    if (booking.userId) {
      this.eventsGateway.sendToUser(booking.userId, 'queue_position_update', {
        bookingId,
        position,
      });
    }
  }

  /**
   * Notify user that booking was cancelled by shop/admin action.
   */
  async sendBookingCancellationNotice(bookingId: string, reason?: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking) return;

    const reasonText = reason ? `\nReason: ${reason}` : '';
    const message =
      `Your booking at ${booking.shop.name} has been cancelled.${reasonText}\n` +
      `Booking #: ${booking.bookingNumber}`;

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      body: message,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      email: booking.customerEmail || undefined,
      phone: booking.customerPhone || undefined,
    });
  }

  /**
   * Notify customer that check-in has been recorded.
   */
  async sendCheckInAcknowledgement(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking) return;

    const message =
      `You're checked in at ${booking.shop.name}.\n` +
      `We'll notify you when your turn is up. Booking #: ${booking.bookingNumber}`;

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.QUEUE_UPDATE,
      title: 'Check-in Confirmed',
      body: message,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      phone: booking.customerPhone || undefined,
    });
  }

  /**
   * Notify customer when turn is approaching.
   */
  async sendTurnApproaching(bookingId: string, position: number): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking) return;

    const message =
      position <= 1
        ? `It's your turn at ${booking.shop.name}. Please proceed to the service desk.`
        : `Only ${position - 1} customer(s) ahead of you at ${booking.shop.name}. Please be ready.`;

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.TURN_NOTIFICATION,
      title: 'Your Turn Is Approaching',
      body: message,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      phone: booking.customerPhone || undefined,
    });
  }

  /**
   * Notify user service is complete and ask for rating
   */
  async sendServiceCompletedAndReview(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        shop: true,
      },
    });

    if (!booking) return;

    const message = `Thanks for visiting ${booking.shop.name}! Please take a moment to rate your experience.`;

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.QUEUE_UPDATE, // Service completed notification
      title: 'Service Completed',
      body: message,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH, NotificationChannel.EMAIL],
      email: booking.customerEmail || undefined,
      phone: booking.customerPhone || undefined,
    });
  }
}
