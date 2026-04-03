import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Patch,
  Delete,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { SlotEngineService } from './slot-engine.service';
import { QueueTrackingService } from './queue-tracking.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueGateway } from './queue.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';
import { CallAheadDto } from './dto/call-ahead.dto';
import { SkipCustomerDto } from './dto/skip-customer.dto';
import { HandleOverrunDto } from './dto/handle-overrun.dto';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly slotEngine: SlotEngineService,
    private readonly queueTrackingService: QueueTrackingService,
    private readonly queueGateway: QueueGateway,
    private readonly notificationsService: NotificationsService,
    private readonly fraudDetectionService: FraudDetectionService,
  ) {}

  @Get('slots/:shopId')
  @Public()
  @ApiOperation({ summary: 'Get available time slots for booking' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'serviceIds', required: false, description: 'Comma-separated service IDs' })
  @ApiQuery({
    name: 'duration',
    required: false,
    description: 'Duration in minutes (used if no serviceIds)',
  })
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
  async getNextSlot(@Param('shopId') shopId: string, @Query('serviceIds') serviceIds: string) {
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

  @Post('join')
  @Public()
  @ApiOperation({ summary: 'Join shop queue as walk-in' })
  async joinQueue(
    @Body()
    body: {
      shopId: string;
      userId?: string;
      customerName?: string;
      customerPhone?: string;
      serviceId?: string;
    },
  ) {
    try {
      const booking = await this.queueService.joinQueue(body);
      await Promise.all([
        this.queueGateway.emitQueueUpdate(body.shopId),
        this.notificationsService.sendBookingConfirmation(booking.id),
      ]);
      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join queue';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':shopId/call-next')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Call next customer in queue' })
  async callNextCustomer(@Param('shopId') shopId: string, @CurrentUser('id') userId: string) {
    try {
      const booking = await this.queueService.callNextCustomer(shopId, userId);
      await Promise.all([
        this.queueGateway.emitQueueUpdate(shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
      ]);

      const position = await this.queueService.getQueuePosition(booking.id).catch(() => 1);
      await this.notificationsService.sendTurnApproaching(booking.id, position);
      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to call next customer';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':shopId/call-ahead')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Call ahead a specific customer in queue' })
  async callAheadCustomer(
    @Param('shopId') shopId: string,
    @Body() dto: CallAheadDto,
    @CurrentUser('id') userId: string,
  ) {
    try {
      const booking = await this.queueService.callAheadCustomer(
        shopId,
        dto.bookingId,
        userId,
        dto.message,
      );

      await Promise.all([
        this.queueGateway.emitQueueUpdate(shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
        this.notificationsService.sendTurnApproaching(booking.id, 1),
      ]);

      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to call ahead customer';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':shopId/skip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Skip a customer in queue' })
  async skipCustomer(
    @Param('shopId') shopId: string,
    @Body() dto: SkipCustomerDto,
    @CurrentUser('id') userId: string,
  ) {
    try {
      const booking = await this.queueService.skipCustomer(shopId, dto.bookingId, userId, dto.reason);

      await Promise.all([
        this.queueGateway.emitQueueUpdate(shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
      ]);

      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to skip customer';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':shopId/overrun')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Handle queue overrun by extending a booking and shifting upcoming slots' })
  async handleOverrun(
    @Param('shopId') shopId: string,
    @Body() dto: HandleOverrunDto,
    @CurrentUser('id') userId: string,
  ) {
    try {
      const booking = await this.queueService.handleOverrun(
        shopId,
        dto.bookingId,
        userId,
        dto.extraMinutes,
        dto.note,
      );

      if (!booking) {
        throw new NotFoundException('Booking not found after overrun update');
      }

      await Promise.all([
        this.queueGateway.emitQueueUpdate(shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
      ]);

      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to handle overrun';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Patch(':bookingId/check-in')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark booking checked-in' })
  async checkIn(@Param('bookingId') bookingId: string) {
    try {
      const booking = await this.queueService.markCheckedIn(bookingId);
      await Promise.all([
        this.queueGateway.emitQueueUpdate(booking.shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
        this.notificationsService.sendCheckInAcknowledgement(booking.id),
      ]);
      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check in booking';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':bookingId/start-service')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start service after token verification' })
  async startService(
    @Param('bookingId') bookingId: string,
    @Body() body: { verificationCode: string },
    @CurrentUser('id') userId: string,
  ) {
    try {
      const booking = await this.queueService.startService(
        bookingId,
        body.verificationCode,
        userId,
      );
      await Promise.all([
        this.queueGateway.emitQueueUpdate(booking.shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
      ]);
      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start service';

      if (message.toLowerCase().includes('invalid verification code')) {
        await this.fraudDetectionService.logFraudEvent({
          eventType: 'TOKEN_MISMATCH',
          bookingId,
          userId,
          metadata: {
            attemptedCode: body.verificationCode,
            endpoint: 'queue/start-service',
          },
        });
      }

      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post(':bookingId/mark-done')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark service as completed' })
  async markDone(@Param('bookingId') bookingId: string, @CurrentUser('id') userId: string) {
    try {
      const booking = await this.queueService.markServiceDone(bookingId, userId);
      await Promise.all([
        this.queueGateway.emitQueueUpdate(booking.shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
      ]);
      return booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete service';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Delete(':bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove booking from queue' })
  async removeFromQueue(@Param('bookingId') bookingId: string, @Body() body: { reason?: string }) {
    try {
      const booking = await this.queueService.removeFromQueue(bookingId, body?.reason);
      await Promise.all([
        this.queueGateway.emitQueueUpdate(booking.shopId),
        this.queueGateway.emitBookingUpdate(booking.id, {
          status: booking.status,
          serviceStatus: booking.serviceStatus,
        }),
        this.notificationsService.sendBookingCancellationNotice(booking.id, body?.reason),
      ]);
      return booking;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to remove booking from queue';
      if (message.toLowerCase().includes('not found')) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  // --- Tracking & Chat Endpoints ---

  @Get('tracking/:shopId')
  @ApiOperation({ summary: 'Get trackable current/next bookings for shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  async getTrackableBookings(@Param('shopId') shopId: string) {
    return this.queueTrackingService.getTrackableBookings(shopId);
  }

  @Get('tracking/:bookingId/messages')
  @ApiOperation({ summary: 'Get chat history for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  async getMessages(@Param('bookingId') bookingId: string) {
    return this.queueTrackingService.getMessages(bookingId);
  }

  @Post('tracking/:bookingId/messages')
  @ApiOperation({ summary: 'Post a chat message to a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  async postMessage(
    @Param('bookingId') bookingId: string,
    @Body() data: { senderId: string; senderType: 'USER' | 'SHOP'; content: string },
  ) {
    return this.queueTrackingService.createMessage(
      bookingId,
      data.senderId,
      data.senderType,
      data.content,
    );
  }
}
