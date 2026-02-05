import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus, BookingSource, DayOfWeek } from '@prisma/client';
import { CreateWalkInDto } from './dto/create-walk-in.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
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
      weeklyStats: weeklyStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {} as Record<string, number>),
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
      status?: BookingStatus;
      page?: number;
      limit?: number;
    },
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    const { date, status, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: any = { shopId };

    if (date) {
      const dateStart = new Date(`${date}T00:00:00`);
      const dateEnd = new Date(`${date}T23:59:59`);
      where.startTime = { gte: dateStart, lte: dateEnd };
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
   * Update working hours
   */
  async updateWorkingHours(
    shopId: string,
    dayOfWeek: DayOfWeek,
    dto: UpdateWorkingHoursDto,
    tenantId: string,
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    return this.prisma.workingHours.upsert({
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
      maxConcurrentBookings: shop.maxConcurrentBookings,
      autoAcceptBookings: shop.autoAcceptBookings,
      settings: shop.settings,
    };
  }

  /**
   * Update shop settings
   */
  async updateShopSettings(
    shopId: string,
    tenantId: string,
    settings: {
      name?: string;
      maxConcurrentBookings?: number;
      autoAcceptBookings?: boolean;
      settings?: Record<string, any>;
    },
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    return this.prisma.shop.update({
      where: { id: shopId },
      data: settings,
    });
  }

  private async verifyShopAccess(shopId: string, tenantId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Not authorized to access this shop');
    }

    return shop;
  }
}
