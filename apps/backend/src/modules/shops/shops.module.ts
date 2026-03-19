import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
