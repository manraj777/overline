import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';
import * as sgMail from '@sendgrid/mail';
import { Twilio } from 'twilio';

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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private twilioClient: Twilio | null = null;
  private sendgridEnabled = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Twilio
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (twilioSid && twilioToken) {
      this.twilioClient = new Twilio(twilioSid, twilioToken);
      this.logger.log('Twilio SMS enabled');
    }

    // Initialize SendGrid
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      this.sendgridEnabled = true;
      this.logger.log('SendGrid email enabled');
    }
  }

  /**
   * Send notification to user
   */
  async send(payload: NotificationPayload): Promise<void> {
    const { userId, bookingId, type, title, body, data, channels, email, phone } = payload;

    // Create notification records for each channel (if userId exists)
    if (userId) {
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

      // Send through each channel
      for (const notification of notifications) {
        await this.sendThroughChannel(notification, email, phone);
      }
    } else {
      // Guest booking - send directly without storing
      if (channels.includes(NotificationChannel.EMAIL) && email) {
        await this.sendEmail(email, title, body);
      }
      if (channels.includes(NotificationChannel.SMS) && phone) {
        await this.sendSms(phone, body);
      }
    }
  }

  /**
   * Send through specific channel
   */
  private async sendThroughChannel(
    notification: any,
    email?: string,
    phone?: string,
  ): Promise<void> {
    try {
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          const userEmail = email || (await this.getUserEmail(notification.userId));
          if (userEmail) {
            await this.sendEmail(userEmail, notification.title, notification.body);
          }
          break;

        case NotificationChannel.SMS:
          const userPhone = phone || (await this.getUserPhone(notification.userId));
          if (userPhone) {
            await this.sendSms(userPhone, notification.body);
          }
          break;

        case NotificationChannel.PUSH:
          // TODO: Implement FCM push notifications
          this.logger.log(`Push notification: ${notification.title}`);
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
      this.logger.error(`Failed to send ${notification.channel} notification:`, error);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED },
      });
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!this.sendgridEnabled) {
      this.logger.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
      return;
    }

    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@overline.app';

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
   * Send SMS via Twilio
   */
  private async sendSms(to: string, body: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.log(`[SMS Mock] To: ${to}, Message: ${body}`);
      return;
    }

    const fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    try {
      await this.twilioClient.messages.create({
        body,
        to,
        from: fromPhone,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error('Twilio error:', error);
      throw error;
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
    });
    const timeStr = startTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const message = `Your booking at ${booking.shop.name} is confirmed!\n\n` +
      `📅 Date: ${dateStr}\n` +
      `⏰ Time: ${timeStr}\n` +
      `📍 Address: ${booking.shop.address}\n` +
      `🔢 Booking #: ${booking.bookingNumber}\n\n` +
      `See you soon!`;

    await this.send({
      userId: booking.userId || undefined,
      bookingId: booking.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Booking Confirmed! ✅',
      body: message,
      data: {
        bookingNumber: booking.bookingNumber,
        shopName: booking.shop.name,
        startTime: booking.startTime.toISOString(),
      },
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      email: booking.customerEmail || undefined,
      phone: booking.customerPhone || undefined,
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
    });

    const message = `Reminder: Your appointment at ${booking.shop.name} is in 1 hour at ${timeStr}.\n` +
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
  }
}
