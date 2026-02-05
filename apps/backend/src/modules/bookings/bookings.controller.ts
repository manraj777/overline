import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { BookingStatus } from '@prisma/client';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 409, description: 'Time slot not available' })
  async create(@Body() dto: CreateBookingDto, @CurrentUser('id') userId: string) {
    return this.bookingsService.create(dto, userId);
  }

  @Post('guest')
  @Public()
  @ApiOperation({ summary: 'Create a booking as guest (no account required)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  async createGuestBooking(@Body() dto: CreateBookingDto) {
    if (!dto.customerName || !dto.customerPhone) {
      throw new Error('Guest bookings require customer name and phone');
    }
    return this.bookingsService.create(dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getMyBookings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bookingsService.findByUser(userId, status, page, limit);
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
}
