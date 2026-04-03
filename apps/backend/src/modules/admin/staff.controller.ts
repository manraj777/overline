import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BookingStatus, DayOfWeek, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueueService } from '../queue/queue.service';
import { QueueTrackingService } from '../queue/queue-tracking.service';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { UpdateStaffBankDetailsDto } from './dto/update-staff-bank-details.dto';
import { UpdateStaffOwnScheduleDto } from './dto/update-staff-own-schedule.dto';
import { UpdateOwnBookingStatusDto } from './dto/update-own-booking-status.dto';

class ScheduleDayDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;
}

class PutScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  days!: ScheduleDayDto[];
}

class CreateOwnServiceDto {
  @IsString()
  shopId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxClientsPerHour?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

class UpdateOwnServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxClientsPerHour?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class MediaUrlDto {
  @IsString()
  url!: string;
}

class QueueCallAheadDto {
  @IsString()
  shopId!: string;

  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

class QueueOverrunDto {
  @IsString()
  shopId!: string;

  @IsString()
  bookingId!: string;

  @IsInt()
  @Min(5)
  @Max(120)
  extraMinutes!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class ReplyReviewDto {
  @IsString()
  reply!: string;
}

class UpiDto {
  @IsString()
  upiId!: string;
}

@ApiTags('staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.STAFF)
export class StaffController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly queueTrackingService: QueueTrackingService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Own profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.adminService.getStaffProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile' })
  async updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateStaffProfileDto) {
    return this.adminService.updateStaffProfile(userId, dto);
  }

  @Get('me/schedule')
  @ApiOperation({ summary: 'Weekly schedule' })
  async getSchedule(@CurrentUser('id') userId: string) {
    return this.adminService.getStaffOwnSchedule(userId);
  }

  @Put('me/schedule')
  @ApiOperation({ summary: 'Bulk update weekly schedule' })
  async putSchedule(@CurrentUser('id') userId: string, @Body() dto: PutScheduleDto) {
    if (!dto.days?.length) {
      throw new BadRequestException('days is required');
    }

    for (const day of dto.days) {
      await this.adminService.updateStaffOwnSchedule(userId, day.dayOfWeek, {
        startTime: day.startTime,
        endTime: day.endTime,
        isOff: day.isOff,
      } as UpdateStaffOwnScheduleDto);
    }

    return this.adminService.getStaffOwnSchedule(userId);
  }

  @Get('me/services')
  @ApiOperation({ summary: 'Own services' })
  async getServices(@CurrentUser('id') userId: string) {
    return this.adminService.getStaffAssignedServices(userId);
  }

  @Post('me/services')
  @ApiOperation({ summary: 'Create service' })
  async createService(@CurrentUser('id') userId: string, @Body() dto: CreateOwnServiceDto) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId, shopId: dto.shopId, isActive: true, isSuspended: false },
      select: { id: true },
    });

    if (!profile) {
      throw new ForbiddenException('You are not an active staff member of this shop');
    }

    return this.prisma.service.create({
      data: {
        shopId: dto.shopId,
        staffProfileId: profile.id,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        price: dto.price,
        durationMinutes: dto.durationMinutes,
        maxClientsPerHour: dto.maxClientsPerHour || 1,
        category: dto.category,
      },
    });
  }

  @Patch('me/services/:id')
  @ApiOperation({ summary: 'Update service' })
  async updateService(
    @CurrentUser('id') userId: string,
    @Param('id') serviceId: string,
    @Body() dto: UpdateOwnServiceDto,
  ) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service?.staffProfileId) {
      throw new NotFoundException('Service not found');
    }

    const profile = await this.prisma.staffProfile.findFirst({
      where: {
        id: service.staffProfileId,
        userId,
        isActive: true,
        isSuspended: false,
      },
      select: { id: true },
    });

    if (!profile) {
      throw new ForbiddenException('You can only update your own services');
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.maxClientsPerHour !== undefined
          ? { maxClientsPerHour: dto.maxClientsPerHour }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  @Post('me/services/:id/photos')
  @ApiOperation({ summary: 'Upload photos URL for service' })
  async addServicePhoto(
    @CurrentUser('id') userId: string,
    @Param('id') serviceId: string,
    @Body() dto: MediaUrlDto,
  ) {
    const service = await this.assertOwnService(userId, serviceId);
    const photos = service.photos || [];
    if (!photos.includes(dto.url)) {
      photos.push(dto.url);
    }
    return this.prisma.service.update({
      where: { id: service.id },
      data: { photos },
    });
  }

  @Post('me/services/:id/videos')
  @ApiOperation({ summary: 'Upload videos URL for service' })
  async addServiceVideo(
    @CurrentUser('id') userId: string,
    @Param('id') serviceId: string,
    @Body() dto: MediaUrlDto,
  ) {
    const service = await this.assertOwnService(userId, serviceId);
    const videos = service.videos || [];
    if (!videos.includes(dto.url)) {
      videos.push(dto.url);
    }
    return this.prisma.service.update({
      where: { id: service.id },
      data: { videos },
    });
  }

  @Get('me/bookings')
  @ApiOperation({ summary: 'Own bookings' })
  async getBookings(
    @CurrentUser('id') userId: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getStaffOwnBookings(userId, {
      date,
      startDate,
      endDate,
      status,
      page,
      limit,
    });
  }

  @Get('me/bookings/pending')
  @ApiOperation({ summary: 'Pending approvals' })
  async getPendingBookings(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getStaffOwnBookings(userId, {
      status: BookingStatus.PENDING_APPROVAL,
      page,
      limit,
    });
  }

  @Patch('me/bookings/:id/approve')
  @ApiOperation({ summary: 'Approve booking' })
  async approveBooking(@CurrentUser('id') userId: string, @Param('id') bookingId: string) {
    return this.adminService.updateStaffOwnBookingStatus(userId, bookingId, {
      status: BookingStatus.CONFIRMED,
    } as UpdateOwnBookingStatusDto);
  }

  @Patch('me/bookings/:id/reject')
  @ApiOperation({ summary: 'Reject booking' })
  async rejectBooking(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateStaffOwnBookingStatus(userId, bookingId, {
      status: BookingStatus.CANCELLED,
      notes: reason,
    } as UpdateOwnBookingStatusDto);
  }

  @Patch('me/bookings/:id/complete')
  @ApiOperation({ summary: 'Mark done' })
  async completeBooking(@CurrentUser('id') userId: string, @Param('id') bookingId: string) {
    return this.adminService.updateStaffOwnBookingStatus(userId, bookingId, {
      status: BookingStatus.COMPLETED,
    } as UpdateOwnBookingStatusDto);
  }

  @Patch('me/bookings/:id/cash')
  @ApiOperation({ summary: 'Log cash payment' })
  async logCash(@CurrentUser('id') userId: string, @Param('id') bookingId: string) {
    const [legacyStaff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId, isActive: true }, select: { id: true } }),
    ]);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          ...(legacyStaff ? [{ staffId: legacyStaff.id }] : []),
          ...(profile ? [{ staffProfileId: profile.id }] : []),
        ],
      },
    });

    if (!booking) {
      throw new ForbiddenException('You can only update your own assigned bookings');
    }

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentMethod: PaymentMethod.PAY_AT_SHOP,
        paymentStatus: PaymentStatus.COMPLETED,
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  @Post('me/queue/call-ahead')
  @ApiOperation({ summary: 'Ping next 3 / call-ahead' })
  async callAhead(@CurrentUser('id') userId: string, @Body() dto: QueueCallAheadDto) {
    return this.queueService.callAheadCustomer(dto.shopId, dto.bookingId, userId, dto.message);
  }

  @Patch('me/queue/overrun')
  @ApiOperation({ summary: 'Push times by N min' })
  async overrun(@CurrentUser('id') userId: string, @Body() dto: QueueOverrunDto) {
    return this.queueService.handleOverrun(
      dto.shopId,
      dto.bookingId,
      userId,
      dto.extraMinutes,
      dto.note,
    );
  }

  @Get('me/queue/locations')
  @ApiOperation({ summary: 'Client locations for own queue' })
  async getQueueLocations(@CurrentUser('id') userId: string) {
    const [legacyStaff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId, isActive: true }, select: { id: true } }),
    ]);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.booking.findMany({
      where: {
        startTime: { gte: startOfDay },
        status: { in: [BookingStatus.PENDING, BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED] },
        userLat: { not: null },
        userLng: { not: null },
        OR: [
          ...(legacyStaff ? [{ staffId: legacyStaff.id }] : []),
          ...(profile ? [{ staffProfileId: profile.id }] : []),
        ],
      },
      select: {
        id: true,
        bookingNumber: true,
        userId: true,
        startTime: true,
        status: true,
        userLat: true,
        userLng: true,
        locationSharedAt: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  @Get('me/earnings')
  @ApiOperation({ summary: 'Own earnings only' })
  async getEarnings(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('breakdown') breakdown?: string,
  ) {
    return this.adminService.getStaffOwnEarnings(userId, { startDate, endDate, breakdown });
  }

  @Get('me/reviews')
  @ApiOperation({ summary: 'Own reviews only' })
  async getReviews(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('rating') rating?: number,
    @Query('withComment') withComment?: string | boolean,
    @Query('unanswered') unanswered?: string | boolean,
  ) {
    const toBool = (value?: string | boolean) => value === true || value === 'true';
    return this.adminService.getStaffOwnReviews(userId, {
      page,
      limit,
      rating: rating ? Number(rating) : undefined,
      withComment: toBool(withComment),
      unanswered: toBool(unanswered),
    });
  }

  @Patch('me/reviews/:id/reply')
  @ApiOperation({ summary: 'Reply to review' })
  async replyReview(
    @CurrentUser('id') userId: string,
    @Param('id') reviewId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, staffProfileId: profile.id },
      select: { id: true },
    });

    if (!review) {
      throw new ForbiddenException('You can only reply to your own reviews');
    }

    return this.prisma.review.update({
      where: { id: review.id },
      data: {
        staffReply: dto.reply,
        repliedAt: new Date(),
      },
    });
  }

  @Post('me/payment/upi')
  @ApiOperation({ summary: 'Save UPI for payouts' })
  async saveUpi(@CurrentUser('id') userId: string, @Body() dto: UpiDto) {
    return this.adminService.updateStaffBankDetails(userId, {
      upiId: dto.upiId,
    } as UpdateStaffBankDetailsDto);
  }

  @Get('me/payment')
  @ApiOperation({ summary: 'Payment status' })
  async getPaymentStatus(@CurrentUser('id') userId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        upiId: true,
        upiVerified: true,
        bankAccountNo: true,
        bankIfsc: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    return {
      id: profile.id,
      upiId: profile.upiId,
      upiVerified: profile.upiVerified,
      bankAccountNo: profile.bankAccountNo
        ? `${'*'.repeat(Math.max(profile.bankAccountNo.length - 4, 0))}${profile.bankAccountNo.slice(-4)}`
        : null,
      bankIfsc: profile.bankIfsc,
    };
  }

  private async assertOwnService(userId: string, serviceId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId, isActive: true, isSuspended: false },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, staffProfileId: profile.id },
    });

    if (!service) {
      throw new ForbiddenException('You can only update your own services');
    }

    return service;
  }
}
