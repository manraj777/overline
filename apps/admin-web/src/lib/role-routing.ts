import { UserRole } from '@/types';

const PUBLIC_ROUTE_PREFIXES = ['/login', '/register', '/auth/google/callback', '/404'];

const OWNER_ROUTE_PREFIXES = ['/owner'];
const STAFF_ROUTE_PREFIXES = ['/staff'];
const PLATFORM_ROUTE_PREFIXES = ['/platform'];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((route) => pathname.startsWith(route));
}

export function isAdminRole(role?: UserRole | null): boolean {
  return role === UserRole.OWNER || role === UserRole.STAFF || role === UserRole.SUPER_ADMIN;
}

export function getDefaultRouteForRole(role?: UserRole | null): string {
  if (role === UserRole.STAFF) return '/staff/dashboard';
  if (role === UserRole.SUPER_ADMIN) return '/platform/dashboard';
  return '/owner/dashboard';
}

function getEffectiveRoleForPath(
  role: UserRole | undefined | null,
  pathname: string,
): UserRole | undefined | null {
  if (role !== UserRole.USER) {
    return role;
  }

  if (pathname.startsWith('/owner')) {
    return UserRole.OWNER;
  }

  if (pathname.startsWith('/staff')) {
    return UserRole.STAFF;
  }

  if (pathname.startsWith('/platform')) {
    return UserRole.SUPER_ADMIN;
  }

  return role;
}

export function canAccessPath(role: UserRole | undefined | null, pathname: string): boolean {
  const effectiveRole = getEffectiveRoleForPath(role, pathname);
  if (!effectiveRole) return false;

  if (
    pathname.startsWith('/owner') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/platform')
  ) {
    if (OWNER_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return effectiveRole === UserRole.OWNER;
    }
    if (STAFF_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return effectiveRole === UserRole.STAFF;
    }
    if (PLATFORM_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return effectiveRole === UserRole.SUPER_ADMIN;
    }
  }

  return true;
}

export function getLegacyRedirectForRole(pathname: string, role: UserRole | undefined | null): string | null {
  if (!role) return null;

  const roleRoot = getDefaultRouteForRole(role);
  const legacyMap: Record<string, string> = {
    '/dashboard': '/dashboard',
    '/appointments': '/bookings',
    '/queue': '/queue',
    '/staff': '/staff',
    '/services': '/services',
    '/settings': '/settings',
    '/payments': '/payments',
    '/analytics': '/analytics/revenue',
    '/fraud': '/analytics/fraud',
    '/notifications': '/notifications',
  };

  const target = legacyMap[pathname];
  if (!target) {
    return null;
  }

  if (role === UserRole.OWNER) {
    return `/owner${target}`;
  }

  if (role === UserRole.STAFF) {
    if (pathname === '/dashboard') return '/staff/dashboard';
    if (pathname === '/queue') return '/staff/queue';
    if (pathname === '/appointments') return '/staff/bookings';
    if (pathname === '/notifications') return '/staff/notifications';
    if (pathname === '/services') return '/staff/services';
    if (pathname === '/payments') return '/staff/payments';
    if (pathname === '/settings') return '/staff/profile';
    return roleRoot;
  }

  if (role === UserRole.SUPER_ADMIN) {
    return roleRoot;
  }

  return null;
}