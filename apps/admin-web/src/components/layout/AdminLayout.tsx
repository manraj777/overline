import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  CreditCard,
  Star,
  ShieldAlert,
  Briefcase,
  Clock3,
  Wallet,
  User,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useLogout, useUnreadNotificationsCount, useQueueSocket, useUpdateBookingStatus } from '@/hooks';
import { useToast, BookingApprovalModal } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/types';
import { getDefaultRouteForRole, isPublicRoute } from '@/lib/role-routing';

interface PendingBooking {
  id: string;
  bookingNumber: string;
  customerName?: string;
  startTime: string;
  services?: { serviceName: string }[];
  user?: { name: string; phone?: string; trustScore?: number };
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, isAuthenticated, shopId, pendingOtpVerification } = useAuthStore();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const prevQueueLengthRef = React.useRef<number | null>(null);
  const userRole = (user?.role as UserRole) || UserRole.USER;
  const isStaff = userRole === UserRole.STAFF;
  const isOwnerLike = userRole === UserRole.OWNER || userRole === UserRole.SUPER_ADMIN;

  const [pendingBookings, setPendingBookings] = React.useState<PendingBooking[]>([]);
  const updateBookingStatus = useUpdateBookingStatus();

  const { data: unreadData } = useUnreadNotificationsCount();
  const unreadCount = unreadData?.count || 0;

  useQueueSocket({
    shopId: shopId || undefined,
    enabled: isAuthenticated && !!shopId && isOwnerLike,
    onQueueUpdate: React.useCallback(
      (update: any) => {
        queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        const currentLength = update?.queue?.length || 0;
        if (prevQueueLengthRef.current !== null && currentLength > prevQueueLengthRef.current) {
          const newBookings = update?.queue?.filter((b: any) => b.status === 'PENDING') || [];
          if (newBookings.length > 0) {
            setPendingBookings((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const toAdd = newBookings.filter((b: any) => !existingIds.has(b.id));
              return [...prev, ...toAdd];
            });
          } else {
            addToast({ type: 'info', title: 'New Booking', message: 'A new appointment has been added to the queue.', duration: 5000 });
          }
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        prevQueueLengthRef.current = currentLength;
      },
      [addToast, queryClient]
    ),
    onBookingUpdate: React.useCallback(
      (update: any) => {
        if (update?.status === 'PENDING' && update?.id) {
          setPendingBookings((prev) => {
            if (prev.some((p) => p.id === update.id)) return prev;
            return [...prev, update];
          });
        }
        if (update?.status === 'CANCELLED') {
          addToast({ type: 'warning', title: 'Booking Cancelled', message: `A booking was just cancelled.`, duration: 5000 });
          queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
        }
      },
      [addToast, queryClient]
    ),
  });

  const handleApproveBooking = React.useCallback(
    async (bookingId: string) => {
      try {
        await updateBookingStatus.mutateAsync({ bookingId, status: 'CONFIRMED' });
        setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
        addToast({ type: 'success', title: 'Booking Approved', message: 'The booking has been confirmed.' });
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to approve', message: 'Could not approve the booking.' });
      }
    },
    [updateBookingStatus, addToast]
  );

  const handleDenyBooking = React.useCallback(
    async (bookingId: string) => {
      try {
        await updateBookingStatus.mutateAsync({ bookingId, status: 'CANCELLED' });
        setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
        addToast({ type: 'success', title: 'Booking Denied', message: 'The booking has been cancelled.' });
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to deny', message: 'Could not deny the booking.' });
      }
    },
    [updateBookingStatus, addToast]
  );

  const handleDismissPendingBooking = React.useCallback((bookingId: string) => {
    setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
  }, []);

  const navigationByRole: Record<UserRole, NavigationSection[]> = {
    [UserRole.OWNER]: [
      {
        title: 'Shop',
        items: [
          { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
          { name: 'All Bookings', href: '/owner/bookings', icon: Calendar },
          { name: 'Live Queue', href: '/owner/queue', icon: Users },
        ],
      },
      {
        title: 'Team',
        items: [
          { name: 'My Staff', href: '/owner/staff', icon: Users },
          { name: 'Staff Earnings', href: '/owner/earnings/staff', icon: CreditCard },
        ],
      },
      {
        title: 'Shop Config',
        items: [
          { name: 'Services', href: '/owner/services', icon: Scissors },
          { name: 'Shop Settings', href: '/owner/settings', icon: Settings },
          { name: 'Payments Setup', href: '/owner/payments', icon: CreditCard },
        ],
      },
      {
        title: 'Analytics',
        items: [
          { name: 'Revenue Report', href: '/owner/analytics/revenue', icon: BarChart3 },
          { name: 'Reviews (all)', href: '/owner/analytics/reviews', icon: Star },
          { name: 'Fraud Alerts', href: '/owner/analytics/fraud', icon: ShieldAlert },
        ],
      },
    ],
    [UserRole.STAFF]: [
      {
        title: 'My Day',
        items: [
          { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
          { name: 'My Queue', href: '/staff/queue', icon: Users },
          { name: 'My Bookings', href: '/staff/bookings', icon: Calendar },
        ],
      },
      {
        title: 'My Work',
        items: [
          { name: 'My Services', href: '/staff/services', icon: Briefcase },
          { name: 'My Schedule', href: '/staff/schedule', icon: Clock3 },
        ],
      },
      {
        title: 'My Money',
        items: [
          { name: 'Earnings', href: '/staff/earnings', icon: Wallet },
          { name: 'Payments (UPI)', href: '/staff/payments', icon: CreditCard },
        ],
      },
      {
        title: 'Reputation',
        items: [
          { name: 'My Reviews', href: '/staff/reviews', icon: Star },
        ],
      },
      {
        title: 'Settings',
        items: [
          { name: 'Notifications', href: '/staff/notifications', icon: Bell },
          { name: 'Profile', href: '/staff/profile', icon: User },
        ],
      },
    ],
    [UserRole.SUPER_ADMIN]: [
      {
        title: 'Platform',
        items: [
          { name: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard },
        ],
      },
    ],
    [UserRole.USER]: [],
  };

  const roleSections = navigationByRole[userRole] || [];
  const isActive = (href: string) => router.pathname.startsWith(href);
  const publicRoute = isPublicRoute(router.pathname);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/login');
  };

  React.useEffect(() => {
    if (!isAuthenticated && !publicRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, publicRoute, router]);

  React.useEffect(() => {
    if (isAuthenticated && pendingOtpVerification && router.pathname !== '/login') {
      router.replace('/login?step=otp');
    }
  }, [isAuthenticated, pendingOtpVerification, router]);

  if (!isAuthenticated && !publicRoute) {
    return <div className="min-h-screen bg-surface" />;
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="ovl-admin-bg min-h-screen">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-16 lg:w-[260px] transform transition-transform duration-300 lg:translate-x-0',
          'bg-inverse-surface',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-3 lg:px-6 border-b border-white/5">
          <Link href={getDefaultRouteForRole(user?.role as UserRole)} className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-button">
              <span className="text-white font-black text-sm">O</span>
            </div>
            <span className="hidden lg:inline text-lg font-black text-white tracking-tight">Overline</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 lg:px-3 py-5 space-y-5 overflow-y-auto">
          {roleSections.map((section) => (
            <div key={section.title}>
              <p className="hidden lg:block px-4 mb-2 text-[10px] font-bold tracking-[0.15em] text-white/30 uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive(item.href)
                        ? 'sidebar-link-active'
                        : 'sidebar-link-idle'
                    )}
                    title={item.name}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-2 lg:p-3 border-t border-white/5">
          <div className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center lg:justify-start gap-3 w-full px-3 lg:px-4 py-2.5 mt-1 rounded-xl text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="hidden lg:inline">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className="lg:pl-[260px]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-outline-variant/10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-surface-container-low transition-colors"
            >
              <Menu className="w-5 h-5 text-on-surface" />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-sm ml-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  type="text"
                  placeholder="Search bookings, staff..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button
                onClick={() => router.push(isStaff ? '/staff/notifications' : '/notifications')}
                className="relative p-2.5 rounded-xl hover:bg-surface-container-low transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-on-surface-variant" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-pulse" />
                )}
              </button>

              {/* User Info */}
              <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-outline-variant/10">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-xs">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-on-surface">{user?.name?.split(' ')[0]}</p>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Booking Approval Modal */}
      {isOwnerLike && pendingBookings.length > 0 && (
        <BookingApprovalModal
          booking={pendingBookings[0]}
          onApprove={handleApproveBooking}
          onDeny={handleDenyBooking}
          onClose={() => handleDismissPendingBooking(pendingBookings[0].id)}
          isApproving={updateBookingStatus.isPending}
          isDenying={updateBookingStatus.isPending}
        />
      )}
    </div>
  );
};

export default AdminLayout;

export { AdminLayout };
