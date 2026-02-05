import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SearchShopsDto } from './dto/search-shops.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async search(dto: SearchShopsDto) {
    const {
      query,
      city,
      type,
      latitude,
      longitude,
      radiusKm = 10,
      page = 1,
      limit = 20,
    } = dto;

    const skip = (page - 1) * limit;
    const where: Prisma.ShopWhereInput = {
      isActive: true,
    };

    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
      ];
    }

    // City filter
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    // Type filter (tenant type)
    if (type) {
      where.tenant = { type };
    }

    // If we have lat/lng, we could use PostGIS for radius search
    // For now, basic filter - in production, use raw SQL with ST_DWithin
    let orderBy: Prisma.ShopOrderByWithRelationInput = { name: 'asc' };

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          services: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
            orderBy: { sortOrder: 'asc' },
            take: 5,
          },
          _count: {
            select: {
              services: { where: { isActive: true } },
              staff: { where: { isActive: true } },
            },
          },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);

    // Enhance with queue stats from Redis
    const shopsWithQueue = await Promise.all(
      shops.map(async (shop) => {
        const queueStats = await this.redis.getShopQueueStats(shop.id);
        return {
          ...shop,
          queueStats: queueStats || {
            waitingCount: 0,
            estimatedWaitMinutes: 0,
            nextSlot: null,
          },
        };
      }),
    );

    return {
      data: shopsWithQueue,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        staff: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Get queue stats
    const queueStats = await this.redis.getShopQueueStats(shop.id);

    return {
      ...shop,
      queueStats: queueStats || {
        waitingCount: 0,
        estimatedWaitMinutes: 0,
        nextSlot: null,
      },
    };
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        tenant: true,
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        staff: {
          where: { isActive: true },
        },
        workingHours: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async getServices(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.prisma.service.findMany({
      where: {
        shopId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getQueueStats(shopId: string) {
    // First check Redis cache
    const cached = await this.redis.getShopQueueStats(shopId);
    if (cached) {
      return cached;
    }

    // Calculate from database
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Count pending and confirmed bookings for today
    const waitingBookings = await this.prisma.booking.count({
      where: {
        shopId,
        startTime: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    // Get next available booking slot
    const nextBooking = await this.prisma.booking.findFirst({
      where: {
        shopId,
        startTime: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      orderBy: { startTime: 'asc' },
    });

    // Estimate wait time based on average service duration
    const avgDuration = await this.prisma.service.aggregate({
      where: { shopId, isActive: true },
      _avg: { durationMinutes: true },
    });

    const estimatedWaitMinutes = Math.round(
      waitingBookings * (avgDuration._avg.durationMinutes || 15) / shop.maxConcurrentBookings
    );

    const stats = {
      waitingCount: waitingBookings,
      estimatedWaitMinutes,
      nextSlot: nextBooking?.startTime.toISOString(),
    };

    // Cache in Redis
    await this.redis.updateShopQueueStats(shopId, stats);

    return stats;
  }

  async getCities() {
    const cities = await this.prisma.shop.findMany({
      where: { isActive: true },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });

    return cities.map((c) => c.city);
  }

  async getNearbyShops(latitude: number, longitude: number, radiusKm: number = 10) {
    // For production, use PostGIS with ST_DWithin
    // This is a simplified version using bounding box approximation
    const latDelta = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
    const lngDelta = radiusKm / (111.32 * Math.cos(latitude * Math.PI / 180));

    const shops = await this.prisma.shop.findMany({
      where: {
        isActive: true,
        latitude: {
          gte: latitude - latDelta,
          lte: latitude + latDelta,
        },
        longitude: {
          gte: longitude - lngDelta,
          lte: longitude + lngDelta,
        },
      },
      include: {
        tenant: {
          select: { type: true },
        },
        _count: {
          select: { services: { where: { isActive: true } } },
        },
      },
      take: 50,
    });

    // Calculate actual distance and sort
    const shopsWithDistance = shops.map((shop) => ({
      ...shop,
      distance: this.calculateDistance(
        latitude,
        longitude,
        Number(shop.latitude),
        Number(shop.longitude),
      ),
    }));

    return shopsWithDistance
      .filter((shop) => shop.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
