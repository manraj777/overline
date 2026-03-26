import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface ReviewReminderJob {
  bookingId: string;
  userId: string;
  shopName: string;
}

@Processor('review-reminders')
export class ReviewRemindersWorker {
  private readonly logger = new Logger(ReviewRemindersWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  @Process('schedule-review-reminder')
  async handleReviewReminder(job: Job<ReviewReminderJob>) {
    const { bookingId, userId, shopName } = job.data;
    this.logger.log(`Processing review reminder for booking ${bookingId}`);

    try {
      // Check if user already reviewed this booking
      const existingReview = await this.prisma.review.findFirst({
        where: { bookingId },
      });

      if (existingReview) {
        this.logger.log(`User already reviewed booking ${bookingId}, skipping reminder`);
        return;
      }

      // Get the booking to find tenant
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { shop: true },
      });

      if (!booking) return;

      // Send in-app notification
      await this.notificationsQueue.add(
        'send-notification',
        {
          userId,
          tenantId: booking.shop.tenantId,
          title: 'How was your visit?',
          body: `Rate your experience at ${shopName}`,
          type: 'REVIEW_REMINDER',
          data: { bookingId },
        },
        { attempts: 3, backoff: 2000 },
      );

      this.logger.log(`Review reminder sent for booking ${bookingId}`);
    } catch (err) {
      this.logger.error(`Review reminder failed for booking ${bookingId}: ${err}`);
      throw err;
    }
  }

  @OnQueueFailed()
  handleFailed(job: Job, err: Error) {
    this.logger.error(`Review reminder job #${job.id} failed: ${err.message}`);
  }
}
