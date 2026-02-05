import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { SlotEngineService } from './slot-engine.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly slotEngine: SlotEngineService,
  ) {}

  @Get('slots/:shopId')
  @Public()
  @ApiOperation({ summary: 'Get available time slots for booking' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'serviceIds', required: false, description: 'Comma-separated service IDs' })
  @ApiQuery({ name: 'duration', required: false, description: 'Duration in minutes (used if no serviceIds)' })
  @ApiQuery({ name: 'staffId', required: false, description: 'Optional specific staff member' })
  @ApiResponse({ status: 200, description: 'List of available time slots' })
  async getSlots(
    @Param('shopId') shopId: string,
    @Query('date') date: string,
    @Query('serviceIds') serviceIds?: string,
    @Query('duration') duration?: number,
    @Query('staffId') staffId?: string,
  ) {
    const serviceIdArray = serviceIds ? serviceIds.split(',').filter(Boolean) : [];
    return this.slotEngine.getAvailableSlots({
      shopId,
      date,
      serviceIds: serviceIdArray,
      duration: duration || 30,
      staffId,
    });
  }

  @Get('next-slot/:shopId')
  @Public()
  @ApiOperation({ summary: 'Get next available slot for booking' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiQuery({ name: 'serviceIds', required: true, description: 'Comma-separated service IDs' })
  @ApiResponse({ status: 200, description: 'Next available time slot' })
  async getNextSlot(
    @Param('shopId') shopId: string,
    @Query('serviceIds') serviceIds: string,
  ) {
    const serviceIdArray = serviceIds.split(',').filter(Boolean);
    const slot = await this.slotEngine.getNextAvailableSlot(shopId, serviceIdArray);
    return { slot };
  }

  @Get('position/:bookingId')
  @ApiOperation({ summary: 'Get queue position for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Queue position number' })
  async getPosition(@Param('bookingId') bookingId: string) {
    const position = await this.queueService.getQueuePosition(bookingId);
    return { position };
  }
}
