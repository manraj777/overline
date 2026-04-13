import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private normalizeRole(role: string | undefined | null): string {
    const normalized = String(role || '').trim().toUpperCase();
    if (normalized === 'SUPERADMIN') {
      return 'SUPER_ADMIN';
    }
    return normalized;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const userRole = this.normalizeRole(user.role);
    const requiredNormalized = requiredRoles.map((role) => this.normalizeRole(role));
    let hasRole = requiredNormalized.some((role) => userRole === role);

    // Legacy compatibility: permit OWNER-required routes when this account
    // demonstrably owns or manages active shops, even if stored role is stale USER.
    if (!hasRole && requiredNormalized.includes('OWNER') && user?.id) {
      const ownedCount = await this.prisma.shop.count({
        where: {
          isActive: true,
          OR: [
            { ownerId: user.id },
            ...(user?.tenantId ? [{ tenantId: user.tenantId }] : []),
          ],
        },
      });

      if (ownedCount > 0) {
        hasRole = true;
      }
    }

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
