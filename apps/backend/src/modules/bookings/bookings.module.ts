import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { NoShowCron } from './no-show.cron';
import { PendingApprovalCron } from './pending-approval.cron';
import { QueueModule } from '../queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    NotificationsModule,
    UsersModule,
    FraudDetectionModule,
    WalletModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, NoShowCron, PendingApprovalCron],
  exports: [BookingsService],
})
export class BookingsModule {}
