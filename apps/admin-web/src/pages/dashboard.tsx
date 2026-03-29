import React from 'react';
import Head from 'next/head';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Play,
  Check,
  AlertTriangle,
  Bell,
  Star,
  XCircle,
  CreditCard,
} from 'lucide-react';
import { Card, Badge, Button, StatCard, Loading } from '@/components/ui';
import {
  useDashboard,
  useAdminBookings,
  useStartService,
  useMarkComplete,
  useRevenueChart,
  usePopularServices,
  useRecentActivity,
} from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { LiveTracking } from '@/components/dashboard/LiveTracking';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { TopServicesChart } from '@/components/charts/TopServicesChart';
import { formatTime, formatPrice, cn } from '@/lib/utils';
import { BookingStatus } from '@/types';

function getTrustLevel(user: any): 'normal' | 'warning' | 'danger' | null {
  if (!user) return null;
  const score = user.trustScore ?? 100;
  const totalBookings = user.totalBookings ?? 0;
  if (score < 10 && totalBookings > 5) return 'danger';
  if (score < 40) return 'warning';
  return 'normal';
}

const NOTIFICATION_ICONS: Record<string, { icon: any; color: string }> = {
  NEW_BOOKING: { icon: Calendar, color: 'text-blue-500' },
  BOOKING_CONFIRMED: { icon: Calendar, color: 'text-blue-500' },
  BOOKING_CANCELLED: { icon: XCircle, color: 'text-gray-400' },
  NEW_REVIEW: { icon: Star, color: 'text-yellow-500' },
  REVIEW_SUBMITTED: { icon: Star, color: 'text-yellow-500' },
  PAYMENT_DONE: { icon: CreditCard, color: 'text-green-500' },
  PAYMENT_COMPLETED: { icon: CreditCard, color: 'text-green-500' },
  QUEUE_UPDATE: { icon: Users, color: 'text-indigo-500' },
};

export default function DashboardPage() {
  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: todayBookings, isLoading: loadingBookings } = useAdminBookings({
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const { data: revenueData, isLoading: loadingRevenue } = useRevenueChart(90);
  const { data: topServices, isLoading: loadingServices } = usePopularServices();
  const { data: recentActivity } = useRecentActivity();

  const startService = useStartService();
  const markComplete = useMarkComplete();
  const { shopId } = useAuthStore();

  if (loadingDashboard || loadingBookings) {
    return <Loading text="Loading dashboard..." />;
  }

  const todayStats = dashboard?.todayStats || {
    total: 0,
    completed: 0,
    upcoming: 0,
    inProgress: 0,
    noShow: 0,
    revenue: 0,
  };

  const yesterdayStats = dashboard?.yesterdayStats || {
    total: 0,
    revenue: 0,
  };

  const getChangeProps = (todayVal: number, yesterdayVal: number) => {
    if (yesterdayVal === 0) {
      if (todayVal === 0) return undefined;
      return { value: 'New', type: 'increase' as const };
    }
    const val = Number((((todayVal - yesterdayVal) / yesterdayVal) * 100).toFixed(1));
    return {
      value: val,
      type: val >= 0 ? ('increase' as const) : ('decrease' as const),
    };
  };

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    CONFIRMED: { label: 'Confirmed', variant: 'info' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'error' },
    NO_SHOW: { label: 'No Show', variant: 'error' },
  };

  return (
    <>
      <Head>
        <title>Dashboard - Overline Admin</title>
      </Head>

      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Today's Appointments"
            value={todayStats.total}
            change={getChangeProps(todayStats.total, yesterdayStats.total)}
            icon={Calendar}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard
            title="In Queue"
            value={todayStats.upcoming + todayStats.inProgress}
            icon={Users}
            gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          />
          <StatCard
            title="Completed"
            value={todayStats.completed}
            icon={Clock}
            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
          />
          <StatCard
            title="Today's Revenue"
            value={formatPrice(todayStats.revenue)}
            change={getChangeProps(todayStats.revenue, yesterdayStats.revenue)}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-emerald-500 to-green-600"
          />
        </div>

        {/* Revenue Chart */}
        <div className="mb-8">
          <RevenueChart data={revenueData || []} isLoading={loadingRevenue} />
        </div>

        {/* Two-column: Queue + Top Services */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Today's Queue */}
          <div className="lg:col-span-8">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Queue</h2>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                </div>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Walk-in
                </Button>
              </div>

              {todayBookings?.data.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings?.data.slice(0, 10).map((booking) => {
                    const config = statusConfig[booking.status] || statusConfig.PENDING;
                    const trustLevel = getTrustLevel(booking.user);

                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:shadow-sm',
                          booking.status === 'IN_PROGRESS'
                            ? 'border-primary-200 bg-primary-50'
                            : 'border-gray-200'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-gray-900">
                              {formatTime(booking.startTime)}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {booking.user?.name || booking.customerName || 'Walk-in'}
                              </p>
                              {trustLevel === 'danger' && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium"
                                  title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}%`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                              {trustLevel === 'warning' && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium"
                                  title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}%`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {booking.services?.map((s: any) => s.serviceName).join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={config.variant}>{config.label}</Badge>

                          {booking.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startService.mutate(booking.id)}
                              isLoading={startService.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}

                          {booking.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              onClick={() => markComplete.mutate(booking.id)}
                              isLoading={markComplete.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {shopId && <LiveTracking shopId={shopId} />}

            {/* Top Services */}
            <TopServicesChart data={topServices || []} isLoading={loadingServices} />

            {/* Recent Activity - Now using real data */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {(!recentActivity || recentActivity.length === 0) ? (
                  <div className="text-center py-6">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.slice(0, 5).map((activity: any) => {
                    const iconConfig = NOTIFICATION_ICONS[activity.type] || {
                      icon: Bell,
                      color: 'text-gray-400',
                    };
                    const Icon = iconConfig.icon;

                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={cn('mt-0.5', iconConfig.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{activity.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
