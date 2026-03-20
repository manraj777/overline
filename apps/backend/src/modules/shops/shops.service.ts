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
    const { query, city, type, page = 1, limit = 20 } = dto;
    
    // Explicitly cast coordinates intercepting from the URL so JS bounding box math
    // doesn't accidentally do string-concatenation and crash the Prisma Driver
    const latitude = dto.latitude !== undefined ? Number(dto.latitude) : undefined;
    const longitude = dto.longitude !== undefined ? Number(dto.longitude) : undefined;
    const radiusKm = dto.radiusKm !== undefined ? Number(dto.radiusKm) : 10;

    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.ShopWhereInput = { isActive: true };
    const andFilters: Prisma.ShopWhereInput[] = [];

    // Text search
    if (query) {
      andFilters.push({
        OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        ],
      });
    }

    // City filter
    if (city) {
      andFilters.push({ city: { equals: city, mode: 'insensitive' } });
    }

    // Type filter (tenant type)
    if (type) {
      andFilters.push({ tenant: { type } });
    }

    // If location is provided, keep geo-filtered shops and include shops that do not
    // have coordinates yet so newly created admin shops are still discoverable.
    if (latitude && longitude) {
      const latDelta = radiusKm / 111.32;
      const lngDelta = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));

      andFilters.push({
        OR: [
          {
            AND: [
              {
                latitude: {
                  gte: latitude - latDelta,
                  lte: latitude + latDelta,
                },
              },
              {
                longitude: {
                  gte: longitude - lngDelta,
                  lte: longitude + lngDelta,
                },
              },
            ],
          },
          { latitude: null },
          { longitude: null },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const orderBy: Prisma.ShopOrderByWithRelationInput = { name: 'asc' };

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

    // Enhance with queue stats from Redis and calculate distance
    const shopsWithQueue = await Promise.all(
      shops.map(async (shop) => {
        let queueStats = null;
        try {
          queueStats = await this.redis.getShopQueueStats(shop.id);
        } catch {
          // Redis unavailable — degrade gracefully rather than returning 500
        }
        const distance =
          latitude && longitude && shop.latitude && shop.longitude
            ? this.calculateDistance(
                latitude,
                longitude,
                Number(shop.latitude),
                Number(shop.longitude),
              )
            : undefined;

        return {
          ...shop,
          distance: distance !== undefined ? Math.round(distance * 100) / 100 : undefined,
          queueStats: queueStats || {
            waitingCount: 0,
            estimatedWaitMinutes: 0,
            nextSlot: null,
          },
        };
      }),
    );

    // Sort by distance if location was provided, filter out shops beyond radius
    let sortedShops = shopsWithQueue;
    if (latitude && longitude) {
      sortedShops = shopsWithQueue
        .filter((shop) => shop.distance === undefined || shop.distance <= radiusKm)
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    return {
      data: sortedShops,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find shop by slug or ID (supports both for mobile app compatibility)
   */
  async findBySlug(slugOrId: string) {
    // Check if the parameter is a UUID (ID) or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const includeConfig = {
      tenant: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' } as const,
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
        orderBy: { dayOfWeek: 'asc' } as const,
      },
    };

    let shop = null;

    if (isUuid) {
      // Try to find by ID first
      shop = await this.prisma.shop.findUnique({
        where: { id: slugOrId },
        include: includeConfig,
      });
    }

    // If not found by ID, try by slug
    if (!shop) {
      shop = await this.prisma.shop.findUnique({
        where: { slug: slugOrId },
        include: includeConfig,
      });
    }

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
      (waitingBookings * (avgDuration._avg.durationMinutes || 15)) / shop.maxConcurrentBookings,
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
    const lngDelta = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));

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
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
