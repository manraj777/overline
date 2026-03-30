import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Processor('analytics')
export class AnalyticsWorker {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Pre-compute dashboard stats and cache in Redis every 5 minutes
   */
  @Cron('*/5 * * * *')
  async updateDashboardCache() {
    this.logger.log('Updating dashboard cache...');

    try {
      // Get all active shops
      const shops = await this.prisma.shop.findMany({
        where: { isActive: true },
        select: { id: true, tenantId: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const shop of shops) {
        // Today's stats
        const [total, completed, upcoming, inProgress, noShow] = await Promise.all([
          this.prisma.booking.count({
            where: { shopId: shop.id, startTime: { gte: today, lt: tomorrow } },
          }),
          this.prisma.booking.count({
            where: {
              shopId: shop.id,
              status: 'COMPLETED',
              startTime: { gte: today, lt: tomorrow },
            },
          }),
          this.prisma.booking.count({
            where: {
              shopId: shop.id,
              status: { in: ['PENDING', 'CONFIRMED'] },
              startTime: { gte: today, lt: tomorrow },
            },
          }),
          this.prisma.booking.count({
            where: {
              shopId: shop.id,
              status: 'IN_PROGRESS',
              startTime: { gte: today, lt: tomorrow },
            },
          }),
          this.prisma.booking.count({
            where: { shopId: shop.id, status: 'NO_SHOW', startTime: { gte: today, lt: tomorrow } },
          }),
        ]);

        // Revenue
        const revenueResult = await this.prisma.payment.aggregate({
          where: {
            booking: { shopId: shop.id, startTime: { gte: today, lt: tomorrow } },
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        });

        const stats = {
          total,
          completed,
          upcoming,
          inProgress,
          noShow,
          revenue: Number(revenueResult._sum.amount || 0),
        };

        await this.redis.setJson(`dashboard:stats:${shop.id}`, stats, 300); // 5 min TTL
      }

      this.logger.log(`Dashboard cache updated for ${shops.length} shops`);
    } catch (err) {
      this.logger.error(`Dashboard cache update failed: ${err}`);
    }
  }

  @Process('aggregate-daily')
  async handleDailyAggregation(job: Job<{ shopId: string; date: string }>) {
    this.logger.log(`Aggregating daily analytics for shop ${job.data.shopId} on ${job.data.date}`);
    // This would pre-compute daily metrics and store them
    // Already handled by the AnalyticsService on-the-fly
  }

  @OnQueueFailed()
  handleFailed(job: Job, err: Error) {
    this.logger.error(`Analytics job #${job.id} failed: ${err.message}`);
  }
}
