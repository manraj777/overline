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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useLogout, useUnreadNotificationsCount, useQueueSocket, useUpdateBookingStatus } from '@/hooks';
import { useToast, BookingApprovalModal } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';

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

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, isAuthenticated, shopId, pendingOtpVerification } = useAuthStore();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const prevQueueLengthRef = React.useRef<number | null>(null);

  // Pending booking approval modal state
  const [pendingBookings, setPendingBookings] = React.useState<PendingBooking[]>([]);
  const updateBookingStatus = useUpdateBookingStatus();

  // Fetch unread count if authenticated
  const { data: unreadData } = useUnreadNotificationsCount();
  const unreadCount = unreadData?.count || 0;

  // Global socket listener for new bookings
  useQueueSocket({
    shopId: shopId || undefined,
    enabled: isAuthenticated && !!shopId,
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Queue', href: '/queue', icon: Users },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Services', href: '/services', icon: Scissors },
    { name: 'Staff', href: '/staff', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Fraud Alerts', href: '/fraud', icon: ShieldAlert },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => router.pathname.startsWith(href);
  const publicRoutes = ['/login', '/register', '/auth/google/callback', '/404'];
  const isPublicRoute = publicRoutes.some((route) => router.pathname.startsWith(route));

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/login');
  };

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, isPublicRoute, router]);

  React.useEffect(() => {
    if (isAuthenticated && pendingOtpVerification && router.pathname !== '/login') {
      router.replace('/login?step=otp');
    }
  }, [isAuthenticated, pendingOtpVerification, router]);

  if (!isAuthenticated && !isPublicRoute) {
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="text-lg font-bold text-white">Overline</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-sidebar-hover hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
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
      <div className="lg:pl-64">
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
                onClick={() => router.push('/notifications')}
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
      {pendingBookings.length > 0 && (
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
