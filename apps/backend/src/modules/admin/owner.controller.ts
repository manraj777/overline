import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BookingStatus, Prisma, UserRole } from '@prisma/client';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, ShopIdParam } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ShopOwnerGuard } from '../auth/guards/shop-owner.guard';
import { QueueService } from '../queue/queue.service';
import { AdminService } from './admin.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpdateOwnerShopSettingsDto } from './dto/update-owner-shop-settings.dto';

class InviteStaffDto {
  @IsString()
  shopId!: string;

  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

class ShopScopedDto {
  @IsString()
  shopId!: string;
}

class SuspendStaffDto extends ShopScopedDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class QueueApproveDto extends ShopScopedDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

class QueueCallAheadDto extends ShopScopedDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

class QueueOverrunDto extends ShopScopedDto {
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

class QueueSettingsDto extends ShopScopedDto {
  queueSettings!: Record<string, unknown>;
}

class AddPhotoDto extends ShopScopedDto {
  @IsString()
  url!: string;
}

@ApiTags('owner')
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.OWNER)
export class OwnerController {
  constructor(
    private readonly adminService: AdminService,
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('staff')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Invite staff' })
  async inviteStaff(
    @Body() dto: InviteStaffDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.adminService.createStaff(
      dto.shopId,
      {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        avatarUrl: dto.avatarUrl,
      },
      tenantId,
    );
  }

  @Get('staff')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'List staff' })
  async listStaff(
    @Query('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    return this.adminService.getStaff(shopId, tenantId);
  }

  @Get('staff/:id')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Staff detail' })
  async getStaffDetail(
    @Param('id') staffId: string,
    @Query('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    const [legacyStaff, profile] = await Promise.all([
      this.prisma.staff.findFirst({
        where: { id: staffId, shopId },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      this.prisma.staffProfile.findFirst({
        where: {
          shopId,
          OR: [{ id: staffId }, { userId: staffId }],
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
    ]);

    if (!legacyStaff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    const earningsWhere: Prisma.EarningWhereInput = {
      shopId,
      ...(profile?.id ? { staffProfileId: profile.id } : {}),
    };

    const [services, earnings, reviews] = await Promise.all([
      legacyStaff
        ? this.adminService.getStaffServices(shopId, legacyStaff.id, tenantId)
        : Promise.resolve([]),
      this.prisma.earning.findMany({
        where: earningsWhere,
        orderBy: { earnedAt: 'desc' },
        take: 100,
      }),
      this.prisma.review.findMany({
        where: {
          shopId,
          ...(profile?.id ? { staffProfileId: profile.id } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      legacyStaff,
      profile,
      services,
      earnings,
      reviews,
    };
  }

  @Patch('staff/:id/suspend')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Suspend staff' })
  async suspendStaff(@Param('id') staffId: string, @Body() dto: SuspendStaffDto) {
    const [legacyStaff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { id: staffId, shopId: dto.shopId } }),
      this.prisma.staffProfile.findFirst({
        where: {
          shopId: dto.shopId,
          OR: [{ id: staffId }, { userId: staffId }],
        },
      }),
    ]);

    if (!legacyStaff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    if (legacyStaff) {
      await this.prisma.staff.update({
        where: { id: legacyStaff.id },
        data: { isActive: false },
      });
    }

    if (profile) {
      await this.prisma.staffProfile.update({
        where: { id: profile.id },
        data: {
          isActive: false,
          isSuspended: true,
          suspendReason: dto.reason || null,
        },
      });
    }

    return { success: true };
  }

  @Post('staff/:id/restore')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Restore staff' })
  async restoreStaff(@Param('id') staffId: string, @Body() dto: ShopScopedDto) {
    const [legacyStaff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { id: staffId, shopId: dto.shopId } }),
      this.prisma.staffProfile.findFirst({
        where: {
          shopId: dto.shopId,
          OR: [{ id: staffId }, { userId: staffId }],
        },
      }),
    ]);

    if (!legacyStaff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    if (legacyStaff) {
      await this.prisma.staff.update({
        where: { id: legacyStaff.id },
        data: { isActive: true },
      });
    }

    if (profile) {
      await this.prisma.staffProfile.update({
        where: { id: profile.id },
        data: {
          isActive: true,
          isSuspended: false,
          suspendReason: null,
        },
      });
    }

    return { success: true };
  }

  @Get('earnings')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'All earnings' })
  async getEarnings(
    @Query('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('breakdown') breakdown?: string,
  ) {
    return this.adminService.getShopFinancials(shopId, ownerId, { startDate, endDate, breakdown });
  }

  @Get('earnings/by-staff')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Earnings breakdown by staff' })
  async getEarningsByStaff(
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = {
      ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
    };

    const grouped = await this.prisma.earning.groupBy({
      by: ['staffProfileId'],
      where: {
        shopId,
        ...(startDate || endDate ? { earnedAt: dateRange } : {}),
      },
      _sum: { amount: true, netAmount: true, platformFee: true },
      _count: { _all: true },
    });

    const profiles = await this.prisma.staffProfile.findMany({
      where: { id: { in: grouped.map((g) => g.staffProfileId) } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const profileById = new Map(profiles.map((p) => [p.id, p]));

    return grouped.map((row) => ({
      staffProfileId: row.staffProfileId,
      staff: profileById.get(row.staffProfileId) || null,
      bookingCount: row._count._all,
      grossAmount: Number(row._sum.amount || 0),
      netAmount: Number(row._sum.netAmount || 0),
      platformFee: Number(row._sum.platformFee || 0),
    }));
  }

  @Get('bookings')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'All bookings for owner shop' })
  async getOwnerBookings(
    @Query('shopId') shopId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: BookingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getBookings(shopId, tenantId, {
      date,
      startDate,
      endDate,
      status,
      page,
      limit,
    });
  }

  @Get('queue/live')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'All staff queues live view' })
  async getLiveQueue(@Query('shopId') shopId: string) {
    return this.queueService.getTodayQueue(shopId);
  }

  @Post('queue/:bookingId/approve')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Owner approves queue booking' })
  async approveQueueBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: QueueApproveDto,
    @CurrentUser('id') ownerId: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, shopId: dto.shopId },
      select: { id: true, status: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status !== BookingStatus.PENDING_APPROVAL &&
      booking.status !== BookingStatus.WAITLISTED
    ) {
      throw new BadRequestException('Booking is not in approvable queue state');
    }

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        approvedBy: ownerId,
        approvedAt: new Date(),
        ...(dto.notes ? { adminNotes: dto.notes } : {}),
      },
    });
  }

  @Post('queue/call-ahead')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Trigger call-ahead' })
  async triggerCallAhead(
    @Body() dto: QueueCallAheadDto,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.queueService.callAheadCustomer(dto.shopId, dto.bookingId, ownerId, dto.message);
  }

  @Patch('queue/overrun')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Push slots by N min' })
  async pushQueueOverrun(
    @Body() dto: QueueOverrunDto,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.queueService.handleOverrun(
      dto.shopId,
      dto.bookingId,
      ownerId,
      dto.extraMinutes,
      dto.note,
    );
  }

  @Get('reviews')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'All reviews for owner shop' })
  async getOwnerReviews(
    @Query('shopId') shopId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 20;
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { shopId },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          staffProfile: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          booking: { select: { id: true, bookingNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.review.count({ where: { shopId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  @Get('analytics/revenue')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Revenue analytics' })
  async getRevenueAnalytics(
    @Query('shopId') shopId: string,
    @CurrentUser('id') ownerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('breakdown') breakdown?: string,
  ) {
    return this.adminService.getShopFinancials(shopId, ownerId, { startDate, endDate, breakdown });
  }

  @Patch('settings/shop')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Update shop settings' })
  async updateShopSettings(
    @Body() dto: UpdateOwnerShopSettingsDto & ShopScopedDto,
    @CurrentUser('id') ownerId: string,
  ) {
    return this.adminService.updateOwnerShopSettings(dto.shopId, ownerId, dto);
  }

  @Patch('settings/queue')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Update queue config' })
  async updateQueueSettings(@Body() dto: QueueSettingsDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { settings: true },
    });

    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};

    await this.prisma.shop.update({
      where: { id: dto.shopId },
      data: {
        settings: {
          ...settings,
          queue: dto.queueSettings || {},
        } as Prisma.InputJsonValue,
      },
    });

    return { shopId: dto.shopId, queue: dto.queueSettings || {} };
  }

  @Post('settings/photos')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Upload shop photos' })
  async addShopPhoto(@Body() dto: AddPhotoDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { settings: true },
    });

    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const photos = Array.isArray(settings.shopPhotos)
      ? (settings.shopPhotos as unknown[]).map((v) => String(v))
      : [];

    if (!photos.includes(dto.url)) {
      photos.push(dto.url);
    }

    await this.prisma.shop.update({
      where: { id: dto.shopId },
      data: {
        settings: {
          ...settings,
          shopPhotos: photos,
        } as Prisma.InputJsonValue,
      },
    });

    return { shopId: dto.shopId, photos };
  }

  @Delete('settings/photos/:id')
  @UseGuards(ShopOwnerGuard)
  @ShopIdParam('shopId')
  @ApiOperation({ summary: 'Delete shop photo' })
  @ApiQuery({ name: 'shopId', required: true })
  async deleteShopPhoto(@Param('id') id: string, @Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { settings: true },
    });

    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const photos = Array.isArray(settings.shopPhotos)
      ? (settings.shopPhotos as unknown[]).map((v) => String(v))
      : [];

    const target = decodeURIComponent(id);
    const updated = photos.filter((photo) => photo !== target);

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...settings,
          shopPhotos: updated,
        } as Prisma.InputJsonValue,
      },
    });

    return { shopId, photos: updated };
  }
}
