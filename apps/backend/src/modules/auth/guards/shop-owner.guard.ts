import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SHOP_ID_PARAM_KEY } from '../decorators/roles.decorator';

@Injectable()
export class ShopOwnerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: string } | undefined;

    if (!user || user.role !== 'OWNER') {
      throw new ForbiddenException('Owner access required');
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
      throw new ForbiddenException('shopId is required for owner access checks');
    }

    const ownsShop = await this.prisma.shop.findFirst({
      where: {
        id: shopId,
        ownerId: user.id,
      },
      select: { id: true },
    });

    if (!ownsShop) {
      throw new ForbiddenException('You do not own this shop');
    }

    return true;
  }
}
