// @ts-nocheck
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SHOP_ID_PARAM_KEY } from '../decorators/roles.decorator';

@Injectable()
export class ShopMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: string; tenantId?: string | null } | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const shopIdParam = this.reflector.getAllAndOverride<string>(SHOP_ID_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'shopId';

    const shopId: string | undefined =
      request.params?.[shopIdParam] ||
      request.body?.[shopIdParam] ||
      request.query?.[shopIdParam];
    if (!shopId) {
      throw new ForbiddenException('shopId is required');
    }

    if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') {
      return true;
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, ownerId: true, tenantId: true },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    if (shop.ownerId === user.id) {
      return true;
    }

    if (user.tenantId && shop.tenantId === user.tenantId) {
      const ownerScopeCount = await this.prisma.shop.count({
        where: {
          ownerId: user.id,
          tenantId: user.tenantId,
          isActive: true,
        },
      });
      if (ownerScopeCount > 0) {
        return true;
      }
    }

    const staffProfile = await this.prisma.staffProfile.findFirst({
      where: {
        userId: user.id,
        shopId,
        isActive: true,
        isSuspended: false,
      },
      select: { id: true },
    });
    if (staffProfile) {
      request.staffProfileId = staffProfile.id;
      return true;
    }

    const legacyStaff = await this.prisma.staff.findFirst({
      where: {
        userId: user.id,
        shopId,
        isActive: true,
      },
      select: { id: true },
    });

    if (legacyStaff) {
      request.legacyStaffId = legacyStaff.id;
      return true;
    }

    throw new ForbiddenException('You are not a member of this shop');
  }
}
