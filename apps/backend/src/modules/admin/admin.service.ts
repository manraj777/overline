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
import { BookingStatus, BookingSource, DayOfWeek, Prisma } from '@prisma/client';
import { CreateWalkInDto } from './dto/create-walk-in.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { UpdateOwnerShopSettingsDto } from './dto/update-owner-shop-settings.dto';
import { UpdateOwnerPayoutDto } from './dto/update-owner-payout.dto';
import { CreateStaffHierarchyDto } from './dto/create-staff-hierarchy.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { SetStaffCommissionDto } from './dto/set-staff-commission.dto';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { UpdateStaffBankDetailsDto } from './dto/update-staff-bank-details.dto';
import { UpdateStaffOwnScheduleDto } from './dto/update-staff-own-schedule.dto';
import { RequestStaffTimeOffDto } from './dto/request-staff-time-off.dto';
import { UpdateStaffTimeOffDto } from './dto/update-staff-time-off.dto';
import { UpdateOwnBookingStatusDto } from './dto/update-own-booking-status.dto';

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

  async updateOwnerShopSettings(
    shopId: string,
    ownerId: string,
    dto: UpdateOwnerShopSettingsDto,
  ) {
    await this.verifyOwnerShopAccess(shopId, ownerId);

    const updateData: Record<string, unknown> = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.bannerUrl !== undefined ? { coverUrl: dto.bannerUrl } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.website !== undefined ? { website: dto.website } : {}),
    };

    if (dto.socialLinks) {
      const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
      const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
      updateData.settings = { ...settings, socialLinks: dto.socialLinks };
    }

    await this.prisma.shop.update({
      where: { id: shopId },
      data: updateData,
    });

    return this.prisma.shop.findUnique({ where: { id: shopId } });
  }

  async updateOwnerPayoutSettings(shopId: string, ownerId: string, dto: UpdateOwnerPayoutDto) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const payoutSettings = {
      ...(((settings.ownerPayout || {}) as Record<string, unknown>) || {}),
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...settings,
          ownerPayout: payoutSettings,
        },
      },
    });

    return { shopId, payoutSettings };
  }

  async getShopFinancials(
    shopId: string,
    ownerId: string,
    filters: { startDate?: string; endDate?: string; breakdown?: string },
  ) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    const range = this.buildDateRange(filters.startDate, filters.endDate);

    const where: Record<string, unknown> = {
      shopId,
      ...(range ? { createdAt: range } : {}),
    };

    const [payments, completedBookings] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.booking.findMany({
        where: {
          shopId,
          status: BookingStatus.COMPLETED,
          ...(range ? { completedAt: range } : {}),
        },
        select: {
          id: true,
          totalAmount: true,
          completedAt: true,
        },
      }),
    ]);

    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount || 0),
      0,
    );
    const totalPayouts = payments
      .filter((payment) => payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      totalRevenue,
      totalPayouts,
      pendingSettlement: Math.max(totalRevenue - totalPayouts, 0),
      transactions: payments.map((payment) => ({
        date: payment.createdAt.toISOString(),
        type: 'booking_payment' as const,
        amount: Number(payment.amount || 0),
        status: String(payment.status || '').toLowerCase(),
      })),
      summary: {
        breakdown: filters.breakdown || 'daily',
      },
    };
  }

  async createStaffHierarchy(shopId: string, ownerId: string, dto: CreateStaffHierarchyDto) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    await this.verifyStaffBelongsToShop(shopId, dto.staffId);

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const hierarchy = ((settings.staffHierarchy || {}) as Record<string, unknown>) || {};
    const roleMap = ((hierarchy.roles || {}) as Record<string, unknown>) || {};
    const managerMap = ((hierarchy.managers || {}) as Record<string, unknown>) || {};

    roleMap[dto.staffId] = dto.role;
    if (dto.subordinateIds?.length) {
      managerMap[dto.staffId] = dto.subordinateIds;
    }

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...settings,
          staffHierarchy: {
            ...hierarchy,
            roles: roleMap,
            managers: managerMap,
            updatedAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    return {
      shopId,
      staffId: dto.staffId,
      role: dto.role,
      subordinates: dto.subordinateIds || [],
    };
  }

  async updateStaffRole(
    shopId: string,
    staffId: string,
    ownerId: string,
    dto: UpdateStaffRoleDto,
  ) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const hierarchy = ((settings.staffHierarchy || {}) as Record<string, unknown>) || {};
    const roleMap = ((hierarchy.roles || {}) as Record<string, unknown>) || {};
    const managerForStaff = ((hierarchy.managerForStaff || {}) as Record<string, unknown>) || {};
    const permissionMap = ((hierarchy.permissions || {}) as Record<string, unknown>) || {};

    roleMap[staffId] = dto.staffRole;
    if (dto.managerId !== undefined) {
      managerForStaff[staffId] = dto.managerId;
    }
    if (dto.permissions) {
      permissionMap[staffId] = dto.permissions;
    }

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...settings,
          staffHierarchy: {
            ...hierarchy,
            roles: roleMap,
            managerForStaff,
            permissions: permissionMap,
            updatedAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    return { staffId, staffRole: dto.staffRole, managerId: dto.managerId, permissions: dto.permissions || [] };
  }

  async getStaffHierarchy(shopId: string, ownerId: string) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    const [shop, staff] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } }),
      this.prisma.staff.findMany({ where: { shopId }, select: { id: true, name: true, isActive: true } }),
    ]);

    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const hierarchy = ((settings.staffHierarchy || {}) as Record<string, unknown>) || {};
    const roleMap = (((hierarchy.roles as Record<string, string>) || {}) as Record<string, string>) || {};
    const managerForStaff =
      (((hierarchy.managerForStaff as Record<string, string>) || {}) as Record<string, string>) || {};

    const staffById = new Map(staff.map((member) => [member.id, member]));
    const managers = staff
      .filter((member) => (roleMap[member.id] || 'TECHNICIAN') === 'MANAGER')
      .map((manager) => ({
        id: manager.id,
        name: manager.name,
        role: roleMap[manager.id] || 'MANAGER',
        subordinates: staff
          .filter((member) => managerForStaff[member.id] === manager.id)
          .map((member) => ({
            id: member.id,
            name: member.name,
            role: roleMap[member.id] || 'TECHNICIAN',
          })),
      }));

    const unassignedStaff = staff
      .filter((member) => !managerForStaff[member.id] && (roleMap[member.id] || 'TECHNICIAN') !== 'MANAGER')
      .map((member) => ({ id: member.id, name: member.name, role: roleMap[member.id] || 'TECHNICIAN' }));

    return {
      managers,
      unassignedStaff,
      totalStaff: staffById.size,
    };
  }

  async reassignStaffManager(shopId: string, staffId: string, ownerId: string, managerId: string) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    await this.verifyStaffBelongsToShop(shopId, staffId);
    await this.verifyStaffBelongsToShop(shopId, managerId);

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const hierarchy = ((settings.staffHierarchy || {}) as Record<string, unknown>) || {};
    const managerForStaff =
      (((hierarchy.managerForStaff as Record<string, string>) || {}) as Record<string, string>) || {};

    managerForStaff[staffId] = managerId;

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...settings,
          staffHierarchy: {
            ...hierarchy,
            managerForStaff,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    return { staffId, managerId };
  }

  async getStaffEarnings(
    shopId: string,
    staffId: string,
    ownerId: string,
    filters: { startDate?: string; endDate?: string; breakdown?: string },
  ) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId },
      select: { id: true, name: true, userId: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const staffProfile = staff.userId
      ? await this.prisma.staffProfile.findFirst({
          where: { userId: staff.userId, shopId },
          select: { id: true },
        })
      : null;

    if (!staffProfile) {
      return {
        staffName: staff.name,
        totalBookings: 0,
        totalEarnings: 0,
        commissionRate: 0,
        bonuses: 0,
        deductions: 0,
        breakdownByService: [],
      };
    }

    const dateRange = this.buildDateRange(filters.startDate, filters.endDate);
    const earnings = await this.prisma.earning.findMany({
      where: {
        shopId,
        staffProfileId: staffProfile.id,
        ...(dateRange ? { earnedAt: dateRange } : {}),
      },
      include: {
        booking: {
          include: {
            service: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { earnedAt: 'desc' },
    });

    const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
    const totalBookings = earnings.length;
    const breakdownMap: Record<string, { serviceName: string; count: number; earnings: number }> = {};

    for (const item of earnings) {
      const serviceName = item.booking?.service?.name || 'Unknown Service';
      if (!breakdownMap[serviceName]) {
        breakdownMap[serviceName] = { serviceName, count: 0, earnings: 0 };
      }
      breakdownMap[serviceName].count += 1;
      breakdownMap[serviceName].earnings += Number(item.netAmount || 0);
    }

    const commissionRate = totalBookings > 0 ? Number(((totalEarnings / totalBookings) * 100).toFixed(2)) : 0;

    return {
      staffName: staff.name,
      totalBookings,
      totalEarnings,
      commissionRate,
      bonuses: 0,
      deductions: 0,
      breakdownByService: Object.values(breakdownMap),
    };
  }

  async setStaffCommission(
    shopId: string,
    staffId: string,
    ownerId: string,
    dto: SetStaffCommissionDto,
  ) {
    await this.verifyOwnerShopAccess(shopId, ownerId);
    await this.verifyStaffBelongsToShop(shopId, staffId);

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { settings: true } });
    const settings = ((shop?.settings || {}) as Record<string, unknown>) || {};
    const commissionMap = ((settings.staffCommissions || {}) as Record<string, unknown>) || {};

    commissionMap[staffId] = {
      commissionType: dto.commissionType,
      commissionValue: dto.commissionValue,
      startDate: dto.startDate,
      endDate: dto.endDate,
      services: dto.services || [],
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        settings: {
          ...settings,
          staffCommissions: commissionMap,
        } as Prisma.InputJsonValue,
      },
    });

    return { staffId, commission: commissionMap[staffId] };
  }

  async getStaffProfile(staffUserId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true, isSuspended: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    return {
      id: profile.id,
      userId: profile.userId,
      shopId: profile.shopId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      bio: profile.bio,
      permissions: [],
      notificationSettings: {
        notifReminderMins: profile.notifReminderMins,
        notifCallAheadMins: profile.notifCallAheadMins,
        notifNewBooking: profile.notifNewBooking,
        notifLocationShare: profile.notifLocationShare,
        notifReview: profile.notifReview,
        notifNoShow: profile.notifNoShow,
      },
      user: profile.user,
    };
  }

  async updateStaffProfile(staffUserId: string, dto: UpdateStaffProfileDto) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true, isSuspended: false },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    return this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
        ...(dto.notifReminderMins !== undefined ? { notifReminderMins: dto.notifReminderMins } : {}),
        ...(dto.notifCallAheadMins !== undefined
          ? { notifCallAheadMins: dto.notifCallAheadMins }
          : {}),
        ...(dto.notifNewBooking !== undefined ? { notifNewBooking: dto.notifNewBooking } : {}),
        ...(dto.notifLocationShare !== undefined ? { notifLocationShare: dto.notifLocationShare } : {}),
        ...(dto.notifReview !== undefined ? { notifReview: dto.notifReview } : {}),
      },
    });
  }

  async updateStaffBankDetails(staffUserId: string, dto: UpdateStaffBankDetailsDto) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true, isSuspended: false },
      select: { id: true, upiId: true, payoutPreference: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const nextUpiId = dto.upiId !== undefined ? dto.upiId.trim() : undefined;
    const upiChanged = nextUpiId !== undefined && nextUpiId !== (profile.upiId || undefined);

    const updated = await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: {
        ...(nextUpiId !== undefined ? { upiId: nextUpiId } : {}),
        ...(dto.bankAccountNo !== undefined ? { bankAccountNo: dto.bankAccountNo } : {}),
        ...(dto.bankIfsc !== undefined ? { bankIfsc: dto.bankIfsc } : {}),
        ...(nextUpiId !== undefined ? { payoutPreference: 'UPI' } : {}),
        ...(dto.bankAccountNo !== undefined || dto.bankIfsc !== undefined
          ? { bankVerificationStatus: 'PENDING' }
          : {}),
        ...(upiChanged
          ? {
              upiVerified: false,
              upiVerificationStatus: 'PENDING',
              fundAccountId: null,
              payoutPreference: 'UPI',
            }
          : {}),
      },
      select: {
        id: true,
        upiId: true,
        upiVerified: true,
        upiVerificationStatus: true,
        bankAccountNo: true,
        bankIfsc: true,
        bankVerificationStatus: true,
        payoutPreference: true,
        razorpayContactId: true,
        fundAccountId: true,
      },
    });

    return {
      ...updated,
      bankAccountNo: updated.bankAccountNo ? this.maskAccountNumber(updated.bankAccountNo) : null,
      bankAccountHolder: dto.bankAccountHolder || null,
    };
  }

  async verifyStaffUpiForPayout(staffUserId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true, isSuspended: false },
      select: { id: true, upiId: true, fundAccountId: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    if (!profile.upiId) {
      throw new BadRequestException('UPI ID is required before verification');
    }

    const isValidUpi = /^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$/.test(profile.upiId);
    if (!isValidUpi) {
      await this.prisma.staffProfile.update({
        where: { id: profile.id },
        data: {
          upiVerified: false,
          upiVerificationStatus: 'FAILED',
        },
      });
      return {
        verified: false,
        status: 'FAILED',
        reason: 'INVALID_UPI_FORMAT',
      };
    }

    const status = profile.fundAccountId ? 'VERIFIED' : 'PENDING';
    const verified = profile.fundAccountId ? true : false;

    await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: {
        upiVerified: verified,
        upiVerificationStatus: status,
      },
    });

    return {
      verified,
      status,
      reason: verified ? 'FUND_ACCOUNT_LINKED' : 'PAYOUT_LINK_PENDING',
    };
  }

  async getStaffPayoutStatus(staffUserId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: {
        id: true,
        upiId: true,
        upiVerified: true,
        upiVerificationStatus: true,
        bankAccountNo: true,
        bankIfsc: true,
        bankVerificationStatus: true,
        payoutPreference: true,
        razorpayContactId: true,
        fundAccountId: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const earnings = await this.prisma.earning.findMany({
      where: { staffProfileId: profile.id },
      orderBy: { earnedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        netAmount: true,
        earnedAt: true,
        settledAt: true,
        razorpayTransferId: true,
      },
    });

    const pendingAmount = earnings
      .filter((item) => !item.settledAt)
      .reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
    const settledAmount = earnings
      .filter((item) => !!item.settledAt)
      .reduce((sum, item) => sum + Number(item.netAmount || 0), 0);

    return {
      profileId: profile.id,
      payoutPreference: profile.payoutPreference || 'UPI',
      onboarding: {
        hasUpi: !!profile.upiId,
        upiId: profile.upiId,
        upiVerified: profile.upiVerified,
        upiVerificationStatus: profile.upiVerificationStatus || 'PENDING',
        bankAccountNo: profile.bankAccountNo
          ? this.maskAccountNumber(profile.bankAccountNo)
          : null,
        bankIfsc: profile.bankIfsc,
        bankVerificationStatus: profile.bankVerificationStatus || 'PENDING',
        razorpayContactLinked: !!profile.razorpayContactId,
        fundAccountLinked: !!profile.fundAccountId,
        routeEligible: !!profile.fundAccountId && profile.upiVerified,
      },
      payouts: {
        pendingAmount,
        settledAmount,
        pendingCount: earnings.filter((item) => !item.settledAt).length,
        settledCount: earnings.filter((item) => !!item.settledAt).length,
      },
      recent: earnings.map((item) => ({
        id: item.id,
        amount: Number(item.netAmount || 0),
        status: item.settledAt ? 'settled' : 'pending',
        earnedAt: item.earnedAt.toISOString(),
        settledAt: item.settledAt?.toISOString() || null,
        reference: item.razorpayTransferId,
      })),
    };
  }

  async getStaffOwnSchedule(staffUserId: string) {
    const [legacyStaff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId: staffUserId, isActive: true } }),
    ]);

    if (!legacyStaff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    const [workingHours, timeOffs] = await Promise.all([
      legacyStaff
        ? this.prisma.staffWorkingHours.findMany({
            where: { staffId: legacyStaff.id },
            orderBy: { dayOfWeek: 'asc' },
          })
        : Promise.resolve([]),
      legacyStaff
        ? this.prisma.staffTimeOff.findMany({
            where: { staffId: legacyStaff.id },
            orderBy: { startTime: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      workingHours,
      timeOffs: timeOffs.map((timeOff) => ({
        ...timeOff,
        status: 'pending',
      })),
      profileSchedules: profile
        ? await this.prisma.staffSchedule.findMany({
            where: { staffProfileId: profile.id },
            include: { breaks: true },
            orderBy: { dayOfWeek: 'asc' },
          })
        : [],
    };
  }

  async updateStaffOwnSchedule(
    staffUserId: string,
    dayOfWeek: DayOfWeek,
    dto: UpdateStaffOwnScheduleDto,
  ) {
    const staff = await this.prisma.staff.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: { id: true, shopId: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const isOff = dto.isOff ?? false;
    const startTime = dto.startTime || '09:00';
    const endTime = dto.endTime || '18:00';

    if (!isOff && startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const result = await this.prisma.staffWorkingHours.upsert({
      where: {
        staffId_dayOfWeek: {
          staffId: staff.id,
          dayOfWeek,
        },
      },
      update: { startTime, endTime, isOff },
      create: { staffId: staff.id, dayOfWeek, startTime, endTime, isOff },
    });

    await this.invalidateSlotCache(staff.shopId);
    return {
      ...result,
      approvalStatus: dto.requiresApproval ? 'pending' : 'approved',
    };
  }

  async requestStaffTimeOff(staffUserId: string, dto: RequestStaffTimeOffDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: { id: true, shopId: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const startTime = new Date(dto.startDate);
    const endTime = new Date(dto.endDate);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      throw new BadRequestException('Invalid time-off range');
    }

    const timeOff = await this.prisma.staffTimeOff.create({
      data: {
        staffId: staff.id,
        startTime,
        endTime,
        reason: dto.reason,
        isFullDay: dto.isFullDay,
      },
    });

    await this.invalidateSlotCache(staff.shopId);
    return {
      ...timeOff,
      status: 'pending',
      urgency: dto.urgency || 'normal',
    };
  }

  async updateStaffTimeOff(staffUserId: string, timeOffId: string, dto: UpdateStaffTimeOffDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: { id: true, shopId: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const existing = await this.prisma.staffTimeOff.findFirst({
      where: { id: timeOffId, staffId: staff.id },
    });
    if (!existing) {
      throw new NotFoundException('Time-off request not found');
    }

    if (existing.startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Past or active time-off cannot be edited');
    }

    const nextStart = dto.startDate ? new Date(dto.startDate) : existing.startTime;
    const nextEnd = dto.endDate ? new Date(dto.endDate) : existing.endTime;

    if (nextEnd <= nextStart) {
      throw new BadRequestException('Invalid time-off range');
    }

    const result = await this.prisma.staffTimeOff.update({
      where: { id: existing.id },
      data: {
        startTime: nextStart,
        endTime: nextEnd,
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
      },
    });

    await this.invalidateSlotCache(staff.shopId);
    return { ...result, status: 'pending' };
  }

  async deleteStaffTimeOffSelf(staffUserId: string, timeOffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: { id: true, shopId: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const existing = await this.prisma.staffTimeOff.findFirst({
      where: { id: timeOffId, staffId: staff.id },
    });
    if (!existing) {
      throw new NotFoundException('Time-off request not found');
    }

    await this.prisma.staffTimeOff.delete({ where: { id: existing.id } });
    await this.invalidateSlotCache(staff.shopId);
    return { success: true };
  }

  async getStaffOwnBookings(
    staffUserId: string,
    filters: {
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: BookingStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const [staff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
    ]);

    if (!staff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      OR: [
        ...(staff ? [{ staffId: staff.id }] : []),
        ...(profile ? [{ staffProfileId: profile.id }] : []),
      ],
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date) {
      where.startTime = {
        gte: new Date(`${filters.date}T00:00:00`),
        lte: new Date(`${filters.date}T23:59:59`),
      };
    } else if (filters.startDate || filters.endDate) {
      where.startTime = {
        ...(filters.startDate ? { gte: new Date(`${filters.startDate}T00:00:00`) } : {}),
        ...(filters.endDate ? { lte: new Date(`${filters.endDate}T23:59:59`) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStaffOwnBookingStatus(
    staffUserId: string,
    bookingId: string,
    dto: UpdateOwnBookingStatusDto,
  ) {
    const [staff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
    ]);
    if (!staff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          ...(staff ? [{ staffId: staff.id }] : []),
          ...(profile ? [{ staffProfileId: profile.id }] : []),
        ],
      },
      select: {
        id: true,
        status: true,
        shopId: true,
      },
    });

    if (!booking) {
      throw new ForbiddenException('You can only update your own assigned bookings');
    }

    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.PENDING_APPROVAL]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.WAITLISTED]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.IN_SERVICE]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.NO_SHOW]: [],
      [BookingStatus.REJECTED]: [],
      [BookingStatus.SKIPPED]: [],
    };

    if (!allowedTransitions[booking.status].includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${booking.status} to ${dto.status}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: dto.status,
        ...(dto.notes ? { adminNotes: dto.notes } : {}),
        ...(dto.status === BookingStatus.IN_PROGRESS ? { startedAt: new Date() } : {}),
        ...(dto.status === BookingStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });

    await this.invalidateSlotCache(booking.shopId);
    return updated;
  }

  async getStaffAssignedServices(staffUserId: string) {
    const [staff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
    ]);

    if (!staff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    const [legacyServices, profileServices] = await Promise.all([
      staff
        ? this.prisma.staffService.findMany({
            where: { staffId: staff.id },
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
          })
        : Promise.resolve([]),
      profile
        ? this.prisma.service.findMany({
            where: { staffProfileId: profile.id },
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
              isActive: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      legacyServices: legacyServices.map((item) => item.service),
      profileServices,
    };
  }

  async getStaffOwnEarnings(
    staffUserId: string,
    filters: { startDate?: string; endDate?: string; breakdown?: string },
  ) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const dateRange = this.buildDateRange(filters.startDate, filters.endDate);
    const earnings = await this.prisma.earning.findMany({
      where: {
        staffProfileId: profile.id,
        ...(dateRange ? { earnedAt: dateRange } : {}),
      },
      orderBy: { earnedAt: 'desc' },
    });

    const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
    const pendingPayment = earnings
      .filter((item) => !item.settledAt)
      .reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
    const lastPayout = earnings.find((item) => !!item.settledAt);

    const breakdownMap: Record<string, { date: string; bookingCount: number; revenue: number; commission: number }> = {};
    for (const earning of earnings) {
      const key = earning.earnedAt.toISOString().slice(0, 10);
      if (!breakdownMap[key]) {
        breakdownMap[key] = { date: key, bookingCount: 0, revenue: 0, commission: 0 };
      }
      breakdownMap[key].bookingCount += 1;
      breakdownMap[key].revenue += Number(earning.amount || 0);
      breakdownMap[key].commission += Number(earning.netAmount || 0);
    }

    return {
      totalEarnings,
      commissionRate: 0,
      breakdownType: filters.breakdown || 'daily',
      breakdown: Object.values(breakdownMap),
      pendingPayment,
      lastPayout: lastPayout
        ? { date: (lastPayout.settledAt || lastPayout.earnedAt).toISOString(), amount: Number(lastPayout.netAmount || 0) }
        : null,
    };
  }

  async getStaffPayoutHistory(staffUserId: string, filters: { startDate?: string; endDate?: string }) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId: staffUserId, isActive: true },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    const dateRange = this.buildDateRange(filters.startDate, filters.endDate);
    const payouts = await this.prisma.earning.findMany({
      where: {
        staffProfileId: profile.id,
        settledAt: { not: null, ...(dateRange || {}) },
      },
      orderBy: { settledAt: 'desc' },
      select: {
        id: true,
        netAmount: true,
        settledAt: true,
        razorpayTransferId: true,
      },
    });

    return {
      data: payouts.map((item) => ({
        id: item.id,
        amount: Number(item.netAmount || 0),
        status: 'completed',
        date: (item.settledAt || new Date()).toISOString(),
        reference: item.razorpayTransferId,
      })),
    };
  }

  async getStaffOwnReviews(
    staffUserId: string,
    filters: {
      page?: number;
      limit?: number;
      rating?: number;
      withComment?: boolean;
      unanswered?: boolean;
    },
  ) {
    const [staff, profile] = await Promise.all([
      this.prisma.staff.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
      this.prisma.staffProfile.findFirst({ where: { userId: staffUserId, isActive: true }, select: { id: true } }),
    ]);

    if (!staff && !profile) {
      throw new NotFoundException('Staff not found');
    }

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const bookingScope = [
      ...(staff ? [{ staffId: staff.id }] : []),
      ...(profile ? [{ staffProfileId: profile.id }] : []),
    ];

    const where: Prisma.ReviewWhereInput = {
      booking: {
        OR: bookingScope,
      },
      ...(filters.rating ? { rating: filters.rating } : {}),
      ...(filters.withComment ? { comment: { not: null } } : {}),
      ...(filters.unanswered ? { reply: null } : {}),
    };

    const [reviews, total, grouped, average, responded] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              createdAt: true,
              service: {
                select: { id: true, name: true },
              },
              services: {
                select: { id: true, serviceName: true },
              },
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true } }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
      this.prisma.review.count({ where: { ...where, reply: { not: null } } }),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    for (const item of grouped) {
      distribution[item.rating] = item._count._all;
    }

    const averageRating = Number(average._avg.rating || 0);
    const fiveStarPct = total > 0 ? (distribution[5] / total) * 100 : 0;
    const responseRate = total > 0 ? (responded / total) * 100 : 0;

    return {
      data: reviews,
      stats: {
        averageRating,
        totalReviews: total,
        distribution,
        fiveStarPct,
        responseRate,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async invalidateSlotCache(shopId: string): Promise<void> {
    await this.redis.invalidateSlots(shopId);
  }

  private async verifyOwnerShopAccess(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId, ownerId } });
    if (!shop) {
      throw new ForbiddenException('Not authorized to manage this shop');
    }
    return shop;
  }

  private buildDateRange(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return undefined;
    }

    return {
      ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
    };
  }

  private maskAccountNumber(value: string) {
    if (value.length <= 4) {
      return value;
    }
    return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
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
