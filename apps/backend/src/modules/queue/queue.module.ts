import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { QueueController } from './queue.controller';
import { ChatController } from './chat.controller';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue.gateway';
import { SlotEngineService } from './slot-engine.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';

import { QueueTrackingService } from './queue-tracking.service';

@Module({
  imports: [PrismaModule, RedisModule, NotificationsModule, FraudDetectionModule],
  controllers: [QueueController, ChatController],
  providers: [QueueService, QueueGateway, SlotEngineService, QueueTrackingService],
  exports: [QueueService, QueueGateway, SlotEngineService, QueueTrackingService],
})
export class QueueModule {}
