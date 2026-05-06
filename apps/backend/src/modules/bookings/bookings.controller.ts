import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CancellationReason } from '@prisma/client';
import { IsString, IsEnum, IsOptional } from 'class-validator';

// DTOs for new endpoints
class VerifyServiceCodeDto {
  @IsString()
  code: string;
}

class CancelWithReasonDto {
  @IsEnum(CancellationReason)
  reason: CancellationReason;

  @IsOptional()
  @IsString()
  reasonDetails?: string;
}

class OwnerCancellationDecisionDto {
  approved: boolean;

  @IsOptional()
  @IsString()
  ownerNote?: string;
}

class CallAheadReplyDto {
  @IsString()
  reply: 'COMING' | 'NOT_COMING' | 'LATER';
}

class ShareLocationDto {
  lat: number;
  lng: number;
}

class RespondCounterOfferDto {
  accept: boolean;
}

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('calculate-price')
  @Public()
  @ApiOperation({ summary: 'Calculate price breakdown for a potential booking' })
  async calculatePrice(@Body() dto: Partial<CreateBookingDto>, @CurrentUser('id') userId?: string) {
    return this.bookingsService.calculatePrice(dto, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 booking attempts per hour per user
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 409, description: 'Time slot not available' })
  @ApiResponse({ status: 429, description: 'Too many booking attempts. Try again later.' })
  async create(@Body() dto: CreateBookingDto, @CurrentUser('id') userId: string, @Req() req: any) {
    const requestContext = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    return this.bookingsService.create(dto, userId, requestContext);
  }

  @Post('guest')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 guest booking attempts per IP per hour
  @ApiOperation({ summary: 'Create a booking as guest (no account required)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 429, description: 'Too many booking attempts. Try again later.' })
  async createGuestBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
    if (!dto.customerName || !dto.customerPhone) {
      throw new Error('Guest bookings require customer name and phone');
    }
    const requestContext = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    return this.bookingsService.create(dto, undefined, requestContext);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter: upcoming, past, or a BookingStatus enum value',
  })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getMyBookings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bookingsService.findByUser(userId, status, page, limit);
  }

  @Get('pending-review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get first completed booking with no review (for modal trigger)' })
  @ApiResponse({ status: 200, description: 'Pending review booking or null' })
  async getPendingReviewBooking(@CurrentUser('id') userId: string) {
    return this.bookingsService.getPendingReviewBooking(userId);
  }

  @Get('lookup/:bookingNumber')
  @Public()
  @ApiOperation({ summary: 'Look up booking by booking number' })
  @ApiParam({ name: 'bookingNumber', description: 'Booking reference number' })
  async lookupByNumber(@Param('bookingNumber') bookingNumber: string) {
    return this.bookingsService.findByBookingNumber(bookingNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async findById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.findById(id, userId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.cancel(id, userId);
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reschedule a booking to a new time' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.reschedule(id, new Date(dto.newStartTime), userId);
  }

  @Post(':id/verify-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify service code (staff enters code to start service)' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Code verified, service started' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  async verifyServiceCode(
    @Param('id') id: string,
    @Body() dto: VerifyServiceCodeDto,
    @CurrentUser('id') staffId: string,
  ) {
    return this.bookingsService.verifyServiceCode(id, dto.code, staffId);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Complete service and credit free cash to user' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Service completed, free cash credited' })
  async completeService(@Param('id') id: string, @CurrentUser('id') staffId: string) {
    return this.bookingsService.completeService(id, staffId);
  }

  @Patch(':id/cancel-with-reason')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel with reason for free cash handling' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled with reason processed' })
  async cancelWithReason(
    @Param('id') id: string,
    @Body() dto: CancelWithReasonDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.cancelWithReason(id, dto.reason, dto.reasonDetails, userId);
  }

  @Post(':id/owner-cancellation-decision')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Owner approves/rejects late cancellation refund' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async ownerCancellationDecision(
    @Param('id') id: string,
    @Body() dto: OwnerCancellationDecisionDto,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.bookingsService.processOwnerCancellationDecision(
      id,
      dto.approved,
      dto.ownerNote,
      ownerId,
    );
  }

  @Post(':id/call-ahead-reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User replies to call-ahead ping' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async callAheadReply(
    @Param('id') id: string,
    @Body() dto: CallAheadReplyDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!['COMING', 'NOT_COMING', 'LATER'].includes(dto.reply)) {
      throw new BadRequestException('reply must be COMING, NOT_COMING, or LATER');
    }
    return this.bookingsService.handleCallAheadReply(id, userId, dto.reply);
  }

  @Post(':id/share-location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User shares location for booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async shareLocation(
    @Param('id') id: string,
    @Body() dto: ShareLocationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.shareLocation(id, userId, dto.lat, dto.lng);
  }

  @Patch(':id/respond-counter-offer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Respond to staff counter offer' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async respondCounterOffer(
    @Param('id') id: string,
    @Body() dto: RespondCounterOfferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.respondCounterOffer(id, dto.accept, userId);
  }
}
