import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Scissors,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  CreditCard,
  Star,
  Clock3,
  Store,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useLogout, useUnreadNotificationsCount, useQueueSocket, useUpdateBookingStatus, useStaffMe, useUpdateStaffMe } from '@/hooks';
import { useShopSettings, useUpdateShopSettings } from '@/hooks/useAdmin';
import { useToast, BookingApprovalModal } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/types';
import { getDefaultRouteForRole, isPublicRoute } from '@/lib/role-routing';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const prevQueueLengthRef = React.useRef<number | null>(null);
  const userRole = (user?.role as UserRole) || UserRole.USER;
  const derivedRole =
    userRole === UserRole.USER && router.pathname.startsWith('/owner')
      ? UserRole.OWNER
      : userRole === UserRole.USER && router.pathname.startsWith('/staff')
        ? UserRole.STAFF
        : userRole;
  const isStaff = derivedRole === UserRole.STAFF;
  const isOwnerLike = derivedRole === UserRole.OWNER || derivedRole === UserRole.SUPER_ADMIN;

  const [pendingBookings, setPendingBookings] = React.useState<PendingBooking[]>([]);
  const updateBookingStatus = useUpdateBookingStatus();

  const { data: unreadData } = useUnreadNotificationsCount();
  const unreadCount = unreadData?.count || 0;

  const { data: staffProfile } = useStaffMe({
    enabled: isAuthenticated && isStaff,
  });
  const updateStaffMe = useUpdateStaffMe();

  // Shop Open/Close toggle (owners only)
  const { data: shopSettings } = useShopSettings();
  const updateShopSettings = useUpdateShopSettings();
  const isShopOpen = shopSettings?.settings?.isOpen !== false; // Default to open

  const handleToggleShopOpen = async () => {
    try {
      await updateShopSettings.mutateAsync({
        settings: { isOpen: !isShopOpen },
      });
      addToast({
        type: 'success',
        title: isShopOpen ? 'Shop is now Closed' : 'Shop is now Open',
        message: isShopOpen
          ? 'Users will see your shop as closed. No new bookings accepted.'
          : 'Users can now see your shop and book appointments.',
      });
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: 'Could not update shop status' });
    }
  };

  const handleToggleOnline = async () => {
    if (!staffProfile) return;
    try {
      await updateStaffMe.mutateAsync({ isActive: !staffProfile.isActive });
      addToast({
        type: 'success',
        title: staffProfile.isActive ? 'Marked as Absent' : 'Marked as Present',
        message: staffProfile.isActive ? 'You will not receive new bookings.' : 'You are visible for new bookings.',
      });
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: 'Could not update status' });
    }
  };

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
            // Play sound for new booking
            try {
              const audio = new Audio('/sounds/notification.mp3');
              audio.play().catch(e => console.warn('Audio play failed:', e));
            } catch(e) {}
            
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            
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
        title: 'Overview',
        items: [
          { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
          { name: 'Queue', href: '/owner/queue', icon: Clock3 },
        ],
      },
      {
        title: 'Business',
        items: [
          { name: 'Bookings', href: '/owner/bookings', icon: Scissors },
          { name: 'Services', href: '/owner/services', icon: Scissors },
          { name: 'Staff', href: '/owner/staff', icon: Users },
        ],
      },
      {
        title: 'Finance',
        items: [
          { name: 'Payments', href: '/owner/payments', icon: CreditCard },
          { name: 'Staff Earnings', href: '/owner/earnings/staff', icon: CreditCard },
        ],
      },
      {
        title: 'Insights',
        items: [
          { name: 'Revenue', href: '/owner/analytics/revenue', icon: Star },
          { name: 'Reviews', href: '/owner/analytics/reviews', icon: Star },
        ],
      },
      {
        title: 'Admin',
        items: [
          { name: 'Shop Profile', href: '/owner/shop', icon: Store },
          { name: 'Notifications', href: '/owner/notifications', icon: Bell },
          { name: 'Settings', href: '/owner/settings', icon: Settings },
        ],
      },
    ],
    [UserRole.STAFF]: [
      {
        title: 'My Day',
        items: [
          { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
          { name: 'Queue', href: '/staff/queue', icon: Clock3 },
          { name: 'Bookings', href: '/staff/bookings', icon: Scissors },
        ],
      },
      {
        title: 'Work',
        items: [
          { name: 'Services', href: '/staff/services', icon: Scissors },
          { name: 'Schedule', href: '/staff/schedule', icon: Clock3 },
          { name: 'Earnings', href: '/staff/earnings', icon: CreditCard },
        ],
      },
      {
        title: 'Account',
        items: [
          { name: 'Reviews', href: '/staff/reviews', icon: Star },
          { name: 'Notifications', href: '/staff/notifications', icon: Bell },
          { name: 'Profile', href: '/staff/profile', icon: Settings },
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

  const roleSections = navigationByRole[derivedRole] || [];
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
    <div className="ovl-admin-bg h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 lg:translate-x-0',
          sidebarCollapsed ? 'w-[84px]' : 'w-[260px]',
          'bg-inverse-surface',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-3 lg:px-6 border-b border-white/5">
          <Link href={getDefaultRouteForRole(derivedRole)} className="flex items-center gap-3">
            <img 
              src="/overline-logo.png" 
              alt="Overline" 
              className="w-9 h-9 rounded-xl object-cover shadow-button"
            />
            {!sidebarCollapsed && <span className="text-lg font-black text-white tracking-tight">Overline</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-5 overflow-y-auto">
          {roleSections.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <p className="px-4 mb-2 text-[10px] font-bold tracking-[0.15em] uppercase text-white/25">{section.title}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      sidebarCollapsed ? 'justify-center' : 'justify-start',
                      isActive(item.href)
                        ? 'sidebar-link-active'
                        : 'sidebar-link-idle'
                    )}
                    title={item.name}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-2 lg:p-3 border-t border-white/5">
          <div className={cn('flex items-center gap-3 px-2 lg:px-4 py-2', sidebarCollapsed ? 'justify-center' : 'justify-start')}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase">{derivedRole}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center lg:justify-start gap-3 w-full px-3 lg:px-4 py-2.5 mt-1 rounded-xl text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!sidebarCollapsed && <span>Sign Out</span>}
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
      <div className={cn('h-screen flex flex-col transition-all duration-300', sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[260px]')}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-surface-container-lowest/70 dark:bg-surface/70 backdrop-blur-xl border-b border-outline-variant/10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(true);
                } else {
                  setSidebarCollapsed((prev) => !prev);
                }
              }}
              className="p-2 rounded-xl hover:bg-surface-container-low transition-colors"
              aria-label="Open or close sidebar"
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
              {/* Shop Open/Close Toggle (Owner only) */}
              {isOwnerLike && shopSettings && (
                <div className="hidden sm:flex items-center gap-2 mr-2 border-r border-outline-variant/10 pr-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-on-surface-variant" />
                    <span className={cn(
                      "text-xs font-bold",
                      isShopOpen ? "text-primary" : "text-error"
                    )}>
                      {isShopOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleShopOpen}
                    disabled={updateShopSettings.isPending}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isShopOpen ? 'bg-primary' : 'bg-error/40'
                    )}
                  >
                    <span className="sr-only">Toggle Shop Open/Closed</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                        isShopOpen ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              )}

              {/* Staff Present/Absent Toggle */}
              {staffProfile && (
                <div className="hidden sm:flex items-center gap-2 mr-2 border-r border-outline-variant/10 pr-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-on-surface-variant" />
                    <span className={cn(
                      "text-xs font-bold",
                      staffProfile.isActive ? "text-primary" : "text-error"
                    )}>
                      {staffProfile.isActive ? 'Present' : 'Absent'}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleOnline}
                    disabled={updateStaffMe.isPending}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      staffProfile.isActive ? 'bg-primary' : 'bg-error/40'
                    )}
                  >
                    <span className="sr-only">Toggle Staff Present/Absent</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                        staffProfile.isActive ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              )}

              <ThemeToggle />

              {/* Notifications */}
              <button
                onClick={() => router.push(isStaff ? '/staff/notifications' : '/owner/notifications')}
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
                  <p className="text-sm font-semibold text-on-surface leading-none mb-1">{user?.name?.split(' ')[0]}</p>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                    derivedRole === UserRole.SUPER_ADMIN ? "bg-primary-fixed text-primary" :
                    derivedRole === UserRole.OWNER ? "bg-tertiary-fixed text-tertiary" :
                    "bg-surface-container-high text-outline"
                  )}>
                    {derivedRole}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-outline-variant/10 pb-safe lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {roleSections.flatMap(section => section.items).slice(0, 4).map((item) => {
            const isItemActive = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full gap-1',
                  isItemActive ? 'text-primary' : 'text-on-surface-variant'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-xl transition-colors',
                  isItemActive ? 'bg-primary-container' : 'bg-transparent'
                )}>
                  <item.icon className={cn("w-5 h-5", isItemActive ? 'text-on-primary-container' : 'text-on-surface-variant')} />
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;

export { AdminLayout };
