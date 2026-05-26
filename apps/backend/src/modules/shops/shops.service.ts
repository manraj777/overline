import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SearchShopsDto } from './dto/search-shops.dto';
import { RegisterShopRequestDto } from './dto/register-shop.dto';
import { Prisma } from '@prisma/client';
import { SlotEngineService } from '../queue/slot-engine.service';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private slotEngine: SlotEngineService,
  ) {}

  private maskPhone(phone?: string | null): string | undefined {
    if (!phone) return undefined;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    return `***${cleaned.slice(-2)}`;
  }

  private getSlotTime(dateTime: Date | string): string {
    const value = typeof dateTime === 'string' ? dateTime : dateTime.toISOString();
    const timePart = value.includes('T') ? value.split('T')[1] : value;
    return timePart.slice(0, 5);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async uniqueShopSlug(baseName: string, city: string): Promise<string> {
    let slug = this.slugify(`${baseName}-${city}`);
    let suffix = 1;

    while (await this.prisma.shop.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${this.slugify(`${baseName}-${city}`)}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  async onboardOwnerShop(ownerId: string, dto: RegisterShopRequestDto) {
    const slug = await this.uniqueShopSlug(dto.shopName, dto.city);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: `${dto.shopName} Tenant`,
        type: dto.shopType,
      },
    });

    const settings: Prisma.InputJsonValue = {
      ownerName: dto.ownerName,
      ownerEmail: dto.ownerEmail,
      ownerPhone: dto.ownerPhone || null,
      googleLink: dto.googleLink || null,
      timing: dto.timing || null,
      submittedAt: new Date().toISOString(),
      ...(dto.settings || {}),
    };

    const shop = await this.prisma.shop.create({
      data: {
        tenantId: tenant.id,
        ownerId,
        name: dto.shopName,
        slug,
        description: dto.shopDescription || null,
        address: dto.address,
        city: dto.city,
        state: dto.state || null,
        postalCode: dto.postalCode || null,
        phone: dto.phone || dto.ownerPhone || null,
        email: dto.email || dto.ownerEmail,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoUrls: dto.galleryUrls || [],
        settings,
        verificationStatus: 'LIVE',
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        verificationStatus: true,
        isActive: true,
      },
    });

    return shop;
  }

  async registerForReview(dto: RegisterShopRequestDto) {
    const slug = await this.uniqueShopSlug(dto.shopName, dto.city);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: `${dto.shopName} Tenant`,
        type: dto.shopType,
      },
    });

    const settings: Prisma.InputJsonValue = {
      ownerName: dto.ownerName,
      ownerEmail: dto.ownerEmail,
      ownerPhone: dto.ownerPhone || null,
      googleLink: dto.googleLink || null,
      timing: dto.timing || null,
      submittedAt: new Date().toISOString(),
      ...(dto.settings || {}),
    };

    const shop = await this.prisma.shop.create({
      data: {
        tenantId: tenant.id,
        ownerId: null,
        name: dto.shopName,
        slug,
        description: dto.shopDescription || null,
        address: dto.address,
        city: dto.city,
        state: dto.state || null,
        postalCode: dto.postalCode || null,
        phone: dto.phone || dto.ownerPhone || null,
        email: dto.email || dto.ownerEmail,
        latitude: dto.latitude,
        longitude: dto.longitude,
        photoUrls: dto.galleryUrls || [],
        settings,
        verificationStatus: 'PENDING_REVIEW',
        isActive: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        verificationStatus: true,
        isActive: true,
      },
    });

    return shop;
  }

  async search(dto: SearchShopsDto) {
    const { query, city, type, targetAudience, page = 1, limit = 20 } = dto;
    const minRating = dto.minRating !== undefined ? Number(dto.minRating) : undefined;
    const maxPrice = dto.maxPrice !== undefined ? Number(dto.maxPrice) : undefined;

    // Explicitly cast coordinates intercepting from the URL so JS bounding box math
    const latitude = dto.latitude !== undefined ? Number(dto.latitude) : undefined;
    const longitude = dto.longitude !== undefined ? Number(dto.longitude) : undefined;
    // Increase default radius so city-searches don't aggressively drop valid shops
    const radiusKm = dto.radiusKm !== undefined ? Number(dto.radiusKm) : 50;

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

    // Target Audience filter
    if (targetAudience) {
      if (targetAudience === 'Mens') {
        andFilters.push({
          NOT: {
            settings: {
              path: ['targetAudience'],
              equals: 'Womens',
            },
          },
        });
      } else if (targetAudience === 'Womens') {
        andFilters.push({
          NOT: {
            settings: {
              path: ['targetAudience'],
              equals: 'Mens',
            },
          },
        });
      } else if (targetAudience === 'Unisex') {
        andFilters.push({
          AND: [
            {
              NOT: {
                settings: {
                  path: ['targetAudience'],
                  equals: 'Mens',
                },
              },
            },
            {
              NOT: {
                settings: {
                  path: ['targetAudience'],
                  equals: 'Womens',
                },
              },
            },
          ],
        });
      }
    }

    if (minRating !== undefined) {
      andFilters.push({
        OR: [
          { googleRating: { gte: minRating } },
          { googleRating: null },
        ],
      });
    }

    if (maxPrice !== undefined) {
      andFilters.push({
        services: {
          some: {
            isActive: true,
            price: { lte: maxPrice },
          },
        },
      });
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
          workingHours: true,
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
    const cacheKey = `shop:profile:${slugOrId}`;
    let cached = null;

    try {
      cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsedShop = JSON.parse(cached);
        const queueStats = await this.redis.getShopQueueStats(parsedShop.id);
        return {
          ...parsedShop,
          queueStats: queueStats || {
            waitingCount: 0,
            estimatedWaitMinutes: 0,
            nextSlot: null,
          },
        };
      }
    } catch (e) {
      // Ignore cache mis-reads
    }

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
        where: {
          NOT: { category: '__DELETED__' },
        },
        orderBy: [
          { isActive: 'desc' as const },
          { sortOrder: 'asc' as const },
        ],
      },
      staff: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
          staffServices: {
            select: {
              serviceId: true,
            },
          },
          staffWorkingHours: true,
          staffTimeOffs: true,
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

    try {
      await this.redis.set(cacheKey, JSON.stringify(shop), 300); // 5 min TTL
    } catch (e) {
      // Ignore cache write errors
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
    const cacheKey = `shop:profile:${id}`;
    let cached = null;

    try {
      cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        tenant: true,
        services: {
          where: {
            NOT: { category: '__DELETED__' },
          },
          orderBy: [
            { isActive: 'desc' },
            { sortOrder: 'asc' }
          ],
        },
        staff: {
          where: { isActive: true },
          include: {
            staffServices: {
              select: {
                serviceId: true,
              },
            },
          },
        },
        workingHours: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    try {
      await this.redis.set(cacheKey, JSON.stringify(shop), 300);
    } catch (e) {}

    return shop;
  }

  async getServices(shopId: string, date?: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const services = await this.prisma.service.findMany({
      where: {
        shopId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const slotDate = date || new Date().toISOString().slice(0, 10);
    const servicesWithSlots = await Promise.all(
      services.map(async (service) => {
        const slots = await this.getServiceSlots(shopId, service.id, slotDate);
        return {
          ...service,
          timeSlots: slots,
        };
      }),
    );

    return servicesWithSlots;
  }

  async getServiceSlots(shopId: string, serviceId: string, date: string) {
    const [shop, service] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.service.findFirst({
        where: {
          id: serviceId,
          shopId,
          isActive: true,
        },
      }),
    ]);

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const slots = await this.slotEngine.getAvailableSlots({
      shopId,
      date,
      serviceIds: [serviceId],
      duration: service.durationMinutes,
    });

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const bookings = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        services: {
          some: {
            serviceId,
          },
        },
      },
      include: {
        user: {
          select: {
            phone: true,
          },
        },
      },
    });

    const bookingByTime = new Map(
      bookings.map((booking) => [this.getSlotTime(booking.startTime), booking]),
    );

    const slotStatuses = await Promise.all(
      slots.map(async (slot) => {
        const time = this.getSlotTime(slot.startTime);
        const redisKey = `slot:${shopId}:${date}:${serviceId}:${time}`;
        const redisBooked = Boolean(await this.redis.get(redisKey));
        const bookedBooking = bookingByTime.get(time);
        const isBooked = !slot.available || redisBooked || Boolean(bookedBooking);

        return {
          time,
          serviceId,
          isBooked,
          bookedBy: isBooked
            ? this.maskPhone(bookedBooking?.user?.phone || bookedBooking?.customerPhone)
            : undefined,
        };
      }),
    );

    return slotStatuses;
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
        workingHours: true,
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

  async getTrendingShops(limit: number = 10) {
    const cacheKey = `trending_shops:${limit}`;
    let cached = null;
    try {
      cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Group by shopId in bookings
    const trending = await this.prisma.booking.groupBy({
      by: ['shopId'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { shopId: true },
      orderBy: { _count: { shopId: 'desc' } },
      take: limit,
    });

    if (trending.length === 0) return { data: [] };

    // Fetch shop details
    const shopIds = trending.map((t) => t.shopId);
    const shops = await this.prisma.shop.findMany({
      where: { id: { in: shopIds } },
      include: {
        tenant: {
          select: { type: true },
        },
        workingHours: true,
        _count: { select: { reviews: true } },
      },
    });

    // Sort to match trending order
    const sortedShops = shopIds.map((id) => shops.find((s) => s.id === id)).filter(Boolean);

    const result = { data: sortedShops };
    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 3600); // 1 hour TTL
    } catch (e) {}
    return result;
  }
}
