import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get shop analytics summary
   */
  async getShopAnalytics(
    shopId: string,
    tenantId: string,
    options: { startDate: Date; endDate: Date },
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    const { startDate, endDate } = options;

    // Get bookings in date range
    const bookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: startDate, lte: endDate },
      },
    });

    // Calculate metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
    const cancelledBookings = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length;
    const noShowBookings = bookings.filter((b) => b.status === BookingStatus.NO_SHOW).length;
    
    const completedWithPayment = bookings.filter(
      (b) => b.status === BookingStatus.COMPLETED,
    );
    const totalRevenue = completedWithPayment.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0,
    );

    // Average wait time (from booking creation to start)
    const avgWaitMinutes =
      completedBookings > 0
        ? bookings
            .filter((b) => b.status === BookingStatus.COMPLETED && b.startedAt)
            .reduce((sum, b) => {
              const wait = (b.startedAt!.getTime() - b.createdAt.getTime()) / 60000;
              return sum + wait;
            }, 0) / completedBookings
        : 0;

    // Peak hours analysis
    const hourCounts: Record<number, number> = {};
    bookings.forEach((b) => {
      const hour = b.startTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

    // Day of week analysis
    const dayCounts: Record<number, number> = {};
    bookings.forEach((b) => {
      const day = b.startTime.getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        noShowBookings,
        completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
        noShowRate: totalBookings > 0 ? (noShowBookings / totalBookings) * 100 : 0,
      },
      revenue: {
        total: totalRevenue,
        average: completedBookings > 0 ? totalRevenue / completedBookings : 0,
      },
      performance: {
        averageWaitMinutes: Math.round(avgWaitMinutes),
        peakHour: peakHour ? parseInt(peakHour[0]) : null,
        peakHourBookings: peakHour ? peakHour[1] : 0,
      },
      byDayOfWeek: Object.entries(dayCounts).map(([day, count]) => ({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)],
        count,
      })),
    };
  }

  /**
   * Get daily analytics for a date range
   */
  async getDailyAnalytics(
    shopId: string,
    tenantId: string,
    options: { startDate: Date; endDate: Date },
  ) {
    await this.verifyShopAccess(shopId, tenantId);

    // Check if we have pre-aggregated data
    const preAggregated = await this.prisma.dailyAnalytics.findMany({
      where: {
        shopId,
        date: { gte: options.startDate, lte: options.endDate },
      },
      orderBy: { date: 'asc' },
    });

    if (preAggregated.length > 0) {
      return preAggregated;
    }

    // Calculate on the fly if not pre-aggregated
    const bookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: options.startDate, lte: options.endDate },
      },
    });

    // Group by date
    const byDate: Record<string, any[]> = {};
    bookings.forEach((b) => {
      const date = b.startTime.toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(b);
    });

    return Object.entries(byDate).map(([date, dayBookings]) => ({
      date,
      totalBookings: dayBookings.length,
      completedBookings: dayBookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
      cancelledBookings: dayBookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
      noShowBookings: dayBookings.filter((b) => b.status === BookingStatus.NO_SHOW).length,
      totalRevenue: dayBookings
        .filter((b) => b.status === BookingStatus.COMPLETED)
        .reduce((sum, b) => sum + Number(b.totalAmount), 0),
    }));
  }

  /**
   * Get service popularity
   */
  async getServiceAnalytics(shopId: string, tenantId: string) {
    await this.verifyShopAccess(shopId, tenantId);

    const serviceStats = await this.prisma.bookingService.groupBy({
      by: ['serviceId', 'serviceName'],
      where: {
        booking: {
          shopId,
          status: BookingStatus.COMPLETED,
        },
      },
      _count: true,
      _sum: {
        price: true,
      },
    });

    return serviceStats
      .map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        bookingCount: s._count,
        revenue: s._sum.price || 0,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount);
  }

  /**
   * Aggregate daily analytics (run by background job)
   */
  async aggregateDailyAnalytics(shopId: string, date: Date): Promise<void> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: dateStart, lte: dateEnd },
      },
    });

    const analytics = {
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
      cancelledBookings: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
      noShowBookings: bookings.filter((b) => b.status === BookingStatus.NO_SHOW).length,
      walkInBookings: bookings.filter((b) => b.source === 'WALK_IN').length,
      totalRevenue: bookings
        .filter((b) => b.status === BookingStatus.COMPLETED)
        .reduce((sum, b) => sum + Number(b.totalAmount), 0),
    };

    // Calculate average wait and peak hour
    const completedWithTimes = bookings.filter(
      (b) => b.status === BookingStatus.COMPLETED && b.startedAt,
    );
    const avgWait =
      completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, b) => {
            return sum + (b.startedAt!.getTime() - b.createdAt.getTime()) / 60000;
          }, 0) / completedWithTimes.length
        : 0;

    const hourCounts: Record<number, number> = {};
    bookings.forEach((b) => {
      const hour = b.startTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

    await this.prisma.dailyAnalytics.upsert({
      where: {
        shopId_date: { shopId, date: dateStart },
      },
      update: {
        ...analytics,
        averageWaitMinutes: avgWait,
        peakHour: peakHour ? parseInt(peakHour[0]) : null,
      },
      create: {
        shopId,
        date: dateStart,
        ...analytics,
        averageWaitMinutes: avgWait,
        peakHour: peakHour ? parseInt(peakHour[0]) : null,
      },
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
