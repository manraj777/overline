import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const SHOP_ID_PARAM_KEY = 'shop_id_param_key';
export const ShopIdParam = (param: string = 'shopId') => SetMetadata(SHOP_ID_PARAM_KEY, param);
