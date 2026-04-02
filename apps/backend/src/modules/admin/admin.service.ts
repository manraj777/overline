import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus, BookingSource, DayOfWeek } from '@prisma/client';
import { CreateWalkInDto } from './dto/create-walk-in.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private queueService: QueueService,
    private bookingsService: BookingsService,
  ) {}

  /**
   * Get dashboard data for a shop
   */
  async getDashboard(shopId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's queue
    const todayQueue = await this.queueService.getTodayQueue(shopId);

    // Get yesterday's stats for percentage change
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const [yesterdayRevenue, yesterdayBookings] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          shopId,
          status: BookingStatus.COMPLETED,
          completedAt: { gte: startOfYesterday, lte: endOfYesterday },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.count({
        where: {
          shopId,
          startTime: { gte: startOfYesterday, lte: endOfYesterday },
        },
      }),
    ]);

    // Get this week's stats
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyStats = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        shopId,
        startTime: { gte: startOfWeek },
      },
      _count: true,
    });

    // Get revenue for today
    const todayRevenue = await this.prisma.booking.aggregate({
      where: {
        shopId,
        status: BookingStatus.COMPLETED,
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { totalAmount: true },
    });

    return {
      queue: todayQueue,
      todayStats: {
        total: todayQueue.stats.total,
        completed: todayQueue.stats.completedCount,
        upcoming: todayQueue.stats.upcomingCount,
        inProgress: todayQueue.stats.inProgressCount,
        noShow: todayQueue.stats.noShowCount,
        revenue: todayRevenue._sum.totalAmount || 0,
      },
      yesterdayStats: {
        total: yesterdayBookings,
        revenue: yesterdayRevenue._sum.totalAmount || 0,
      },
      weeklyStats: weeklyStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Get all bookings for a shop with filters
   */
  async getBookings(
    shopId: string,
    tenantId: string,
    options: {
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: BookingStatus;
      page?: number;
      limit?: number;
    },
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    const { date, startDate, endDate, status } = options;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = { shopId };

    if (date) {
      const dateStart = new Date(`${date}T00:00:00`);
      const dateEnd = new Date(`${date}T23:59:59`);
      where.startTime = { gte: dateStart, lte: dateEnd };
    } else if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(`${startDate}T00:00:00`);
      if (endDate) where.startTime.lte = new Date(`${endDate}T23:59:59`);
    }

    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              // Trust Score fields for admin dashboard
              trustScore: true,
              totalBookings: true,
              completedBookings: true,
              noShowBookings: true,
              cancelledBookings: true,
            },
          },
          services: true,
          staff: {
            select: {
              id: true,
              name: true,
            },
          },
          payment: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update booking status (admin)
   */
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    tenantId: string,
    adminNotes?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { shop: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.shop.tenantId !== tenantId) {
      throw new ForbiddenException('Not authorized');
    }

    const updateData: any = { status };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    switch (status) {
      case BookingStatus.CONFIRMED:
        break;
      case BookingStatus.IN_PROGRESS:
        updateData.arrivedAt = new Date();
        updateData.startedAt = new Date();
        break;
      case BookingStatus.COMPLETED:
        updateData.completedAt = new Date();
        break;
      case BookingStatus.NO_SHOW:
        break;
      case BookingStatus.CANCELLED:
      case BookingStatus.REJECTED:
        updateData.cancelledAt = new Date();
        break;
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        services: true,
        user: {
          select: { name: true, phone: true },
        },
      },
    });

    // Update queue stats
    this.queueService.updateQueueStats(booking.shopId).catch(console.error);

    return updated;
  }

  /**
   * Create a walk-in booking
   */
  async createWalkIn(shopId: string, dto: CreateWalkInDto, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);

    return this.bookingsService.create(
      {
        shopId,
        serviceIds: dto.serviceIds,
        startTime: dto.startTime || new Date().toISOString(),
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        notes: dto.notes,
        source: BookingSource.WALK_IN,
      },
      undefined,
    );
  }

  /**
   * Get shop staff
   */
  async getStaff(shopId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);

    return this.prisma.staff.findMany({
      where: { shopId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        staffServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create staff member
   */
  async createStaff(
    shopId: string,
    dto: { name: string; email: string; phone?: string; role: string; avatarUrl?: string },
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    return this.prisma.staff.create({
      data: {
        shopId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        role: dto.role || 'staff',
        isActive: true,
      },
    });
  }

  /**
   * Update staff member
   */
  async updateStaff(
    shopId: string,
    staffId: string,
    dto: { name?: string; phone?: string; role?: string; isActive?: boolean; avatarUrl?: string },
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    // Verify staff belongs to this shop
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.role && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete staff member
   */
  async deleteStaff(shopId: string, staffId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);

    // Verify staff belongs to this shop
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return this.prisma.staff.delete({
      where: { id: staffId },
    });
  }

  async getStaffServices(shopId: string, staffId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    return this.prisma.staffService.findMany({
      where: { staffId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        service: {
          sortOrder: 'asc',
        },
      },
    });
  }

  async assignServiceToStaff(shopId: string, staffId: string, serviceId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, shopId },
      select: { id: true, isActive: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found for this shop');
    }

    const relation = await this.prisma.staffService.upsert({
      where: {
        staffId_serviceId: {
          staffId,
          serviceId,
        },
      },
      update: {},
      create: {
        staffId,
        serviceId,
      },
    });

    await this.invalidateSlotCache(shopId);
    return relation;
  }

  async unassignServiceFromStaff(
    shopId: string,
    staffId: string,
    serviceId: string,
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    await this.prisma.staffService.deleteMany({
      where: {
        staffId,
        serviceId,
      },
    });

    await this.invalidateSlotCache(shopId);
    return { success: true };
  }

  /**
   * Get staff availability (weekly hours + upcoming time-off blocks)
   */
  async getStaffAvailability(shopId: string, staffId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const [workingHours, timeOff] = await Promise.all([
      this.prisma.staffWorkingHours.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: 'asc' },
      }),
      this.prisma.staffTimeOff.findMany({
        where: {
          staffId,
          endTime: { gte: new Date() },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    return {
      workingHours,
      timeOff,
    };
  }

  /**
   * Update staff working hours for a day
   */
  async updateStaffWorkingHours(
    shopId: string,
    staffId: string,
    dayOfWeek: DayOfWeek,
    dto: { startTime?: string; endTime?: string; isOff?: boolean },
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const isOff = dto.isOff ?? false;

    if (!isOff && (!dto.startTime || !dto.endTime)) {
      throw new BadRequestException('startTime and endTime are required when staff is not off');
    }

    if (!isOff && dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const result = await this.prisma.staffWorkingHours.upsert({
      where: {
        staffId_dayOfWeek: {
          staffId,
          dayOfWeek,
        },
      },
      update: {
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '18:00',
        isOff,
      },
      create: {
        staffId,
        dayOfWeek,
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '18:00',
        isOff,
      },
    });

    await this.invalidateSlotCache(shopId);
    return result;
  }

  /**
   * Add staff time-off window
   */
  async addStaffTimeOff(
    shopId: string,
    staffId: string,
    dto: { startTime: string; endTime: string; reason?: string; isFullDay?: boolean },
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid startTime or endTime');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const result = await this.prisma.staffTimeOff.create({
      data: {
        staffId,
        startTime,
        endTime,
        reason: dto.reason,
        isFullDay: dto.isFullDay ?? false,
      },
    });

    await this.invalidateSlotCache(shopId);
    return result;
  }

  /**
   * Delete staff time-off window
   */
  async deleteStaffTimeOff(shopId: string, staffId: string, timeOffId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const timeOff = await this.prisma.staffTimeOff.findFirst({
      where: {
        id: timeOffId,
        staffId,
      },
      select: { id: true },
    });

    if (!timeOff) {
      throw new NotFoundException('Staff time-off record not found');
    }

    const result = await this.prisma.staffTimeOff.delete({
      where: { id: timeOffId },
    });

    await this.invalidateSlotCache(shopId);
    return result;
  }

  /**
   * Update working hours
   */
  async updateWorkingHours(
    shopId: string,
    dayOfWeek: DayOfWeek,
    dto: UpdateWorkingHoursDto,
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    const result = await this.prisma.workingHours.upsert({
      where: {
        shopId_dayOfWeek: { shopId, dayOfWeek },
      },
      update: {
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        isClosed: dto.isClosed,
        breakWindows: dto.breakWindows || [],
      },
      create: {
        shopId,
        dayOfWeek,
        openTime: dto.openTime || '09:00',
        closeTime: dto.closeTime || '18:00',
        isClosed: dto.isClosed || false,
        breakWindows: dto.breakWindows || [],
      },
    });

    await this.invalidateSlotCache(shopId);
    return result;
  }

  /**
   * Get working hours for a shop
   */
  async getWorkingHours(shopId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);

    return this.prisma.workingHours.findMany({
      where: { shopId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  /**
   * Get shop settings
   */
  async getShopSettings(shopId: string, tenantId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Not authorized');
    }

    return {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      description: shop.description,
      phone: shop.phone,
      email: shop.email,
      website: shop.website,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      postalCode: shop.postalCode,
      country: shop.country,
      logoUrl: shop.logoUrl,
      coverUrl: shop.coverUrl,
      photoUrls: shop.photoUrls,
      maxConcurrentBookings: shop.maxConcurrentBookings,
      autoAcceptBookings: shop.autoAcceptBookings,
      allowCancellation: shop.allowCancellation,
      freeCancellationMinutes: shop.freeCancellationMinutes,
      allowReschedule: shop.allowReschedule,
      freeRescheduleMinutes: shop.freeRescheduleMinutes,
      requireOwnerApproval: shop.requireOwnerApproval,
      settings: shop.settings,
    };
  }

  /**
   * Update shop settings
   */
  async updateShopSettings(
    shopId: string,
    tenantId: string,
    updateData: {
      name?: string;
      description?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      logoUrl?: string;
      coverUrl?: string;
      photoUrls?: string[];
      maxConcurrentBookings?: number;
      autoAcceptBookings?: boolean;
      allowCancellation?: boolean;
      freeCancellationMinutes?: number;
      allowReschedule?: boolean;
      freeRescheduleMinutes?: number;
      requireOwnerApproval?: boolean;
      settings?: Record<string, any>;
    },
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    await this.prisma.shop.update({
      where: { id: shopId },
      data: updateData,
    });

    await this.invalidateSlotCache(shopId);

    // Return full settings object
    return this.getShopSettings(shopId, tenantId);
  }

  async getPayoutDetails(shopId: string, tenantId: string) {
    const shop = await this.verifyShopAccess(shopId, tenantId);
    const settings = (shop.settings as Record<string, any>) || {};

    return {
      shopId: shop.id,
      payoutDetails: settings.payoutDetails || null,
    };
  }

  async updatePayoutDetails(
    shopId: string,
    tenantId: string,
    payoutDetails: {
      accountHolderName?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      upiId?: string;
    },
  ) {
    const shop = await this.verifyShopAccess(shopId, tenantId);
    const currentSettings = (shop.settings as Record<string, any>) || {};

    const mergedPayoutDetails = {
      ...(currentSettings.payoutDetails || {}),
      ...payoutDetails,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...currentSettings,
          payoutDetails: mergedPayoutDetails,
        },
      },
    });

    return {
      shopId,
      payoutDetails: mergedPayoutDetails,
    };
  }

  private async invalidateSlotCache(shopId: string): Promise<void> {
    await this.redis.invalidateSlots(shopId);
  }

  /**
   * Get shops accessible by the current user
   */
  async getMyShops(userId: string, tenantId: string, role: string) {
    // SUPER_ADMIN can see all shops
    if (role === 'SUPER_ADMIN') {
      return this.prisma.shop.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          logoUrl: true,
          tenantId: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    // STAFF: find shops they're assigned to
    if (role === 'STAFF') {
      const staffRecords = await this.prisma.staff.findMany({
        where: { userId, isActive: true },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              address: true,
              city: true,
              logoUrl: true,
              tenantId: true,
            },
          },
        },
      });
      return staffRecords.map((s) => s.shop);
    }

    // OWNER: find shops under their tenant
    if (!tenantId) return [];
    return this.prisma.shop.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        logoUrl: true,
        tenantId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async verifyShopAccess(shopId: string, tenantId: string) {
    // SUPER_ADMIN (no tenantId) can access any shop
    if (!tenantId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId },
      });
      if (!shop) {
        throw new ForbiddenException('Shop not found');
      }
      return shop;
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Not authorized to access this shop');
    }

    return shop;
  }

  private async verifyStaffBelongsToShop(shopId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        shopId,
      },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return staff;
  }

  async getUsers(fraudScoreGt?: number) {
    const where: any = {};
    if (
      Object.prototype.hasOwnProperty.call({ fraudScoreGt }, 'fraudScoreGt') &&
      fraudScoreGt !== undefined
    ) {
      // trustScore < (100 - fraudScoreGt)
      // i.e., fraudScore 50 means trustScore 50
      // wait, let's keep it simple: fraudScore = 100 - trustScore
      where.trustScore = { lt: 100 - fraudScoreGt };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        trustScore: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { trustScore: 'asc' },
    });

    return {
      data: users.map((u) => ({
        ...u,
        fraudScore: 100 - u.trustScore,
      })),
    };
  }

  async suspendUser(userId: string, isSuspended: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !isSuspended },
    });
    return user;
  }
}
