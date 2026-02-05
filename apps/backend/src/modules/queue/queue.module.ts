import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { SlotEngineService } from './slot-engine.service';

@Module({
  controllers: [QueueController],
  providers: [QueueService, SlotEngineService],
  exports: [QueueService, SlotEngineService],
})
export class QueueModule {}
