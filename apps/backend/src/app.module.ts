import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Core Modules
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { QueueModule } from './modules/queue/queue.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UploadModule } from './modules/upload/upload.module';
import { FraudDetectionModule } from './modules/fraud-detection/fraud-detection.module';
import { AiModule } from './modules/ai/ai.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { OtpModule } from './modules/otp/otp.module';

// Workers
import { WorkersModule } from './workers/workers.module';

// Configuration
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Tiered Rate Limiting
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 100 }, // 100/min per IP
      { name: 'auth', ttl: 60000, limit: 10 }, // 10/min per IP
      { name: 'ai', ttl: 60000, limit: 20 }, // 20/min per user
      { name: 'payments', ttl: 60000, limit: 15 }, // 15/min per user
      { name: 'uploads', ttl: 60000, limit: 10 }, // 10/min per user
    ]),

    // Cron Jobs
    ScheduleModule.forRoot(),

    // Core Modules
    PrismaModule,
    RedisModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ShopsModule,
    ServicesModule,
    BookingsModule,
    QueueModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
    AnalyticsModule,
    HealthModule,
    ReviewsModule,
    UploadModule,
    FraudDetectionModule,
    WalletModule,
    OtpModule,
    AiModule,

    // Background Workers
    WorkersModule,
  ],
})
export class AppModule {}
