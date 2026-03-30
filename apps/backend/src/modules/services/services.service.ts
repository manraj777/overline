import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(shopId: string, dto: CreateServiceDto, tenantId: string) {
    // Verify shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Not authorized to manage this shop');
    }

    // Get max sort order
    const maxSort = await this.prisma.service.aggregate({
      where: { shopId },
      _max: { sortOrder: true },
    });

    const created = await this.prisma.service.create({
      data: {
        shopId,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        price: dto.price,
        currency: dto.currency || 'INR',
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    await this.redis.invalidateSlots(shopId);
    return created;
  }

  async findByShop(shopId: string) {
    return this.prisma.service.findMany({
      where: { shopId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async update(serviceId: string, dto: UpdateServiceDto, tenantId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.shop.tenantId !== tenantId) {
      throw new ForbiddenException('Not authorized to manage this service');
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        price: dto.price,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });

    await this.redis.invalidateSlots(service.shopId);
    return updated;
  }

  async delete(serviceId: string, tenantId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.shop.tenantId !== tenantId) {
      throw new ForbiddenException('Not authorized to manage this service');
    }

    // Soft delete by marking inactive
    const deleted = await this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });

    await this.redis.invalidateSlots(service.shopId);
    return deleted;
  }

  async reorder(shopId: string, serviceIds: string[], tenantId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Not authorized to manage this shop');
    }

    // Update sort order for each service
    await Promise.all(
      serviceIds.map((id, index) =>
        this.prisma.service.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    await this.redis.invalidateSlots(shopId);

    return this.findByShop(shopId);
  }
}
