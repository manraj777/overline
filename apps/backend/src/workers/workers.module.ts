import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { NotificationsWorker } from './notifications.worker';
import { AnalyticsWorker } from './analytics.worker';
import { ReviewRemindersWorker } from './review-reminders.worker';

@Module({
  imports: [
    // Bull root configuration — uses the same Redis as the app
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('redis.url');
        if (redisUrl) {
          return { url: redisUrl };
        }
        return {
          redis: {
            host: configService.get('redis.host') || 'localhost',
            port: configService.get('redis.port') || 6379,
            password: configService.get('redis.password') || undefined,
          },
        };
      },
      inject: [ConfigService],
    }),

    // Register queues
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'review-reminders' },
      { name: 'analytics' },
    ),

    // Dependencies
    PrismaModule,
    RedisModule,
    NotificationsModule,
  ],
  providers: [NotificationsWorker, AnalyticsWorker, ReviewRemindersWorker],
  exports: [BullModule],
})
export class WorkersModule {}
