import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SUGGESTED_SERVICES } from './suggested-services';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private async getAuthorizedShop(shopId: string, user: any) {
    if (!user) {
      return null;
    }

    // SUPER_ADMIN has global access
    if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') {
      return this.prisma.shop.findFirst({ where: { id: shopId } });
    }

    // STAFF or OWNER authorized if they belong to the shop
    if (user.shopIds && Array.isArray(user.shopIds) && user.shopIds.includes(shopId)) {
      return this.prisma.shop.findFirst({ where: { id: shopId } });
    }

    // Tenant check fallback for owners
    if (user.tenantId) {
      return this.prisma.shop.findFirst({
        where: {
          id: shopId,
          OR: [{ tenantId: user.tenantId }, { owner: { tenantId: user.tenantId } }],
        },
        include: { owner: { select: { id: true, tenantId: true } } },
      });
    }

    return null;
  }

  async create(shopId: string, dto: CreateServiceDto, user: any) {
    const shop = await this.getAuthorizedShop(shopId, user);

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
        category: dto.category,
        imageUrl: dto.imageUrl,
        currency: dto.currency || 'INR',
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
        isApproved: user.role !== 'STAFF',
        isActive: user.role !== 'STAFF',
      },
    });

    if (user.role === 'STAFF' && user.staffProfileId) {
      await this.prisma.staffProfile.update({
        where: { id: user.staffProfileId },
        data: {
          services: {
            connect: { id: created.id },
          },
        },
      });
    }

    await this.redis.invalidateSlots(shopId);
    return created;
  }

  async findByShop(shopId: string) {
    return this.prisma.service.findMany({
      where: {
        shopId,
        NOT: { category: '__DELETED__' },
      },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' },
      ],
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

  async update(serviceId: string, dto: UpdateServiceDto, user: any) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const authorizedShop = await this.getAuthorizedShop(service.shopId, user);
    if (!authorizedShop) {
      throw new ForbiddenException('Not authorized to manage this service');
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        price: dto.price,
        category: dto.category,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });

    await this.redis.invalidateSlots(service.shopId);
    return updated;
  }

  async delete(serviceId: string, user: any) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const authorizedShop = await this.getAuthorizedShop(service.shopId, user);
    if (!authorizedShop) {
      throw new ForbiddenException('Not authorized to manage this service');
    }

    // Soft delete by setting category to __DELETED__ and isActive to false
    const deleted = await this.prisma.service.update({
      where: { id: serviceId },
      data: { category: '__DELETED__', isActive: false },
    });

    await this.redis.invalidateSlots(service.shopId);
    return deleted;
  }

  async reorder(shopId: string, serviceIds: string[], user: any) {
    const shop = await this.getAuthorizedShop(shopId, user);

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

  getSuggestions(type: string) {
    return SUGGESTED_SERVICES[type] || SUGGESTED_SERVICES['SALON_UNISEX'];
  }

  async approveService(serviceId: string, user: any) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { shop: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const authorizedShop = await this.getAuthorizedShop(service.shopId, user);
    if (!authorizedShop) {
      throw new ForbiddenException('Not authorized to manage this service');
    }

    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Only shop owners or superadmins can approve services');
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: { isApproved: true, isActive: true },
    });

    await this.redis.invalidateSlots(service.shopId);
    return updated;
  }
}
