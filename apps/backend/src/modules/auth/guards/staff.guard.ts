import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SHOP_ID_PARAM_KEY } from '../decorators/roles.decorator';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: string } | undefined;

    if (!user || user.role !== 'STAFF') {
      throw new ForbiddenException('Staff access required');
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
      return true;
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

    if (!staffProfile) {
      const legacyStaff = await this.prisma.staff.findFirst({
        where: {
          userId: user.id,
          shopId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!legacyStaff) {
        throw new ForbiddenException('You are not an active staff member of this shop');
      }

      request.legacyStaffId = legacyStaff.id;
      return true;
    }

    request.staffProfileId = staffProfile.id;
    return true;
  }
}
