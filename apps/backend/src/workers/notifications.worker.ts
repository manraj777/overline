import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../modules/notifications/notifications.service';

export interface SendNotificationJob {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

export interface SendSmsJob {
  phone: string;
  message: string;
}

export interface SendPushJob {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Processor('notifications')
export class NotificationsWorker {
  private readonly logger = new Logger(NotificationsWorker.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<SendNotificationJob>) {
    this.logger.log(`Processing notification job #${job.id} for user ${job.data.userId}`);
    try {
      await this.notificationsService.send({
        userId: job.data.userId,
        type: job.data.type as any,
        title: job.data.title,
        body: job.data.body,
        channels: ['IN_APP'] as any[],
      });
      this.logger.log(`Notification job #${job.id} completed`);
    } catch (err) {
      this.logger.error(`Notification job #${job.id} failed: ${err}`);
      throw err;
    }
  }

  @Process('send-sms')
  async handleSendSms(job: Job<SendSmsJob>) {
    this.logger.log(`Processing SMS job #${job.id} to ${job.data.phone}`);
    // No SMS provider configured. WhatsApp via Meta API handles OTPs in auth.service.
    this.logger.log(`[SMS Mock] To: ${job.data.phone}: ${job.data.message}`);
  }

  @Process('send-push')
  async handleSendPush(job: Job<SendPushJob>) {
    this.logger.log(`Processing push notification job #${job.id}`);
    
    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        this.logger.warn('Firebase Admin not initialized. Skipping push notification.');
        return;
      }

      // Convert any boolean or number data fields to strings for FCM
      const stringifiedData: Record<string, string> = {};
      if (job.data.data) {
        for (const [key, value] of Object.entries(job.data.data)) {
          stringifiedData[key] = String(value);
        }
      }

      await admin.messaging().send({
        token: job.data.fcmToken,
        notification: {
          title: job.data.title,
          body: job.data.body,
        },
        data: stringifiedData,
      });
      
      this.logger.log(`Push successfully sent to device for job #${job.id}`);
    } catch (err) {
      this.logger.error(`Failed to send push notification: ${err}`);
      throw err;
    }
  }

  @OnQueueFailed()
  handleFailed(job: Job, err: Error) {
    this.logger.error(`Job #${job.id} (${job.name}) failed: ${err.message}`, err.stack);
  }
}
