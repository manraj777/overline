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
  ChevronDown,
  Bell,
  CreditCard,
  Star,
  ShieldAlert,
  Briefcase,
  Clock3,
  Wallet,
  User,
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

  // Pending booking approval modal state
  const [pendingBookings, setPendingBookings] = React.useState<PendingBooking[]>([]);
  const updateBookingStatus = useUpdateBookingStatus();

  // Fetch unread count if authenticated
  const { data: unreadData } = useUnreadNotificationsCount();
  const unreadCount = unreadData?.count || 0;

  // Global socket listener for new bookings
  useQueueSocket({
    shopId: shopId || undefined,
    enabled: isAuthenticated && !!shopId && isOwnerLike,
    onQueueUpdate: React.useCallback(
      (update: any) => {
        // Invalidate queries so the dashboard refreshes automatically
        queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });

        // Check if queue grew to display a new booking toast/popup
        const currentLength = update?.queue?.length || 0;
        if (
          prevQueueLengthRef.current !== null &&
          currentLength > prevQueueLengthRef.current
        ) {
          // Find new PENDING bookings to show approval popup
          const newBookings = update?.queue?.filter(
            (b: any) => b.status === 'PENDING'
          ) || [];
          
          if (newBookings.length > 0) {
            setPendingBookings((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const toAdd = newBookings.filter((b: any) => !existingIds.has(b.id));
              return [...prev, ...toAdd];
            });
          } else {
            // Just show toast if no pending bookings
            addToast({
              type: 'info',
              title: 'New Booking',
              message: 'A new appointment has been added to the queue.',
              duration: 5000,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        prevQueueLengthRef.current = currentLength;
      },
      [addToast, queryClient]
    ),
    onBookingUpdate: React.useCallback(
      (update: any) => {
        // Show popup for new PENDING booking
        if (update?.status === 'PENDING' && update?.id) {
          setPendingBookings((prev) => {
            if (prev.some((p) => p.id === update.id)) return prev;
            return [...prev, update];
          });
        }
        // Show toast for cancelled bookings
        if (update?.status === 'CANCELLED') {
          addToast({
            type: 'warning',
            title: 'Booking Cancelled',
            message: `A booking was just cancelled.`,
            duration: 5000,
          });
          queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
        }
      },
      [addToast, queryClient]
    ),
  });

  // Handlers for booking approval/denial
  const handleApproveBooking = React.useCallback(
    async (bookingId: string) => {
      try {
        await updateBookingStatus.mutateAsync({ bookingId, status: 'CONFIRMED' });
        setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
        addToast({
          type: 'success',
          title: 'Booking Approved',
          message: 'The booking has been confirmed.',
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to approve',
          message: 'Could not approve the booking. Please try again.',
        });
      }
    },
    [updateBookingStatus, addToast]
  );

  const handleDenyBooking = React.useCallback(
    async (bookingId: string) => {
      try {
        await updateBookingStatus.mutateAsync({ bookingId, status: 'CANCELLED' });
        setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
        addToast({
          type: 'success',
          title: 'Booking Denied',
          message: 'The booking has been cancelled.',
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to deny',
          message: 'Could not deny the booking. Please try again.',
        });
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
  const staffTheme = {
    sidebarBg: 'bg-[#0f4c75]',
    border: 'border-[#2f6f99]',
    sectionTitle: 'text-cyan-100/90',
    navActive: 'bg-cyan-50 text-cyan-900',
    navIdle: 'text-cyan-100 hover:bg-[#1b5f8f] hover:text-white',
    userSubtext: 'text-cyan-100',
    userCard: 'bg-[#1b5f8f]/80 text-cyan-100',
    buttonIdle: 'text-cyan-100 hover:bg-[#1b5f8f] hover:text-white',
    closeButton: 'text-cyan-100 hover:text-white',
  };
  const ownerTheme = {
    sidebarBg: 'bg-[#312e81]',
    border: 'border-indigo-700/80',
    sectionTitle: 'text-indigo-200/90',
    navActive: 'bg-indigo-100 text-indigo-900',
    navIdle: 'text-indigo-100 hover:bg-indigo-700/80 hover:text-white',
    userSubtext: 'text-indigo-200',
    userCard: 'bg-indigo-700/50 text-indigo-100',
    buttonIdle: 'text-indigo-100 hover:bg-indigo-700/80 hover:text-white',
    closeButton: 'text-indigo-200 hover:text-white',
  };
  const sidebarTheme = isStaff ? staffTheme : ownerTheme;

  const isActive = (href: string) => router.pathname.startsWith(href);
  const publicRoute = isPublicRoute(router.pathname);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/login');
  };

  // Redirect to login if not authenticated
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
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-16 lg:w-[240px] transform transition-transform duration-300 lg:translate-x-0',
          sidebarTheme.sidebarBg,
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center justify-between h-16 px-3 lg:px-6 border-b', sidebarTheme.border)}>
          <Link href={getDefaultRouteForRole(user?.role as UserRole)} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="hidden lg:inline text-lg font-bold text-white">Overline</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className={cn('lg:hidden', sidebarTheme.closeButton)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-4 overflow-y-auto">
          {roleSections.map((section) => (
            <div key={section.title}>
              <p className={cn('hidden lg:block px-3 mb-2 text-[11px] uppercase tracking-wide', sidebarTheme.sectionTitle)}>
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? sidebarTheme.navActive
                        : sidebarTheme.navIdle
                    )}
                    title={item.name}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className={cn('p-2 lg:p-3 border-t', sidebarTheme.border)}>
          <div className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name}
              </p>
              <p className={cn('text-xs truncate', sidebarTheme.userSubtext)}>{user?.role}</p>
            </div>
          </div>
          {user?.role === UserRole.OWNER && (
            <div className={cn('hidden lg:block mt-1 px-3 py-2 rounded-lg text-xs', sidebarTheme.userCard)}>
              <p className="font-semibold truncate">{shopId || 'Current Shop'}</p>
              <button
                type="button"
                className="mt-1 hover:text-white underline underline-offset-2"
                onClick={() => router.push('/owner/dashboard')}
              >
                Switch to customer →
              </button>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center justify-center lg:justify-start gap-3 w-full px-2 lg:px-3 py-2.5 mt-2 rounded-lg text-sm font-medium transition-colors',
              sidebarTheme.buttonIdle
            )}
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:inline">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-[240px]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                onClick={() => router.push(isStaff ? '/staff/notifications' : '/notifications')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                )}
              </button>

              {/* User Menu */}
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.name?.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>

      {/* Booking Approval Modal - show one at a time */}
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
