import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AdminController } from './admin.controller';
import { OwnerController } from './owner.controller';
import { StaffController } from './staff.controller';
import { PlatformController } from './platform.controller';
import { AdminService } from './admin.service';
import { QueueModule } from '../queue/queue.module';
import { BookingsModule } from '../bookings/bookings.module';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [PrismaModule, QueueModule, BookingsModule, GoogleModule],
  controllers: [AdminController, OwnerController, StaffController, PlatformController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
