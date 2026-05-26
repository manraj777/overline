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
  ArrowUpRight,
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
import { useSettingsStore } from '@/stores/settings';

function getTrustLevel(user: any): 'normal' | 'warning' | 'danger' | null {
  if (!user) return null;
  const score = user.trustScore ?? 100;
  const totalBookings = user.totalBookings ?? 0;
  if (score < 10 && totalBookings > 5) return 'danger';
  if (score < 40) return 'warning';
  return 'normal';
}

const NOTIFICATION_ICONS: Record<string, { icon: any; color: string }> = {
  NEW_BOOKING: { icon: Calendar, color: 'text-primary' },
  BOOKING_CONFIRMED: { icon: Calendar, color: 'text-primary' },
  BOOKING_CANCELLED: { icon: XCircle, color: 'text-outline' },
  NEW_REVIEW: { icon: Star, color: 'text-amber-500' },
  REVIEW_SUBMITTED: { icon: Star, color: 'text-amber-500' },
  PAYMENT_DONE: { icon: CreditCard, color: 'text-tertiary' },
  PAYMENT_COMPLETED: { icon: CreditCard, color: 'text-tertiary' },
  QUEUE_UPDATE: { icon: Users, color: 'text-secondary' },
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
  const { language } = useSettingsStore();

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

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'default'; dotColor: string }> = {
    PENDING: { label: 'Pending', variant: 'warning', dotColor: 'bg-amber-400' },
    CONFIRMED: { label: 'Confirmed', variant: 'info', dotColor: 'bg-primary' },
    IN_PROGRESS: { label: 'Active', variant: 'info', dotColor: 'bg-secondary' },
    COMPLETED: { label: 'Done', variant: 'success', dotColor: 'bg-tertiary' },
    CANCELLED: { label: 'Cancelled', variant: 'error', dotColor: 'bg-error' },
    NO_SHOW: { label: 'No Show', variant: 'error', dotColor: 'bg-outline' },
  };

  const metricCards = [
    {
      label: language === 'hi' ? 'आज की बुकिंग' : "Today's Appointments",
      value: String(todayStats.total),
      icon: Calendar,
      delta: getChangeProps(todayStats.total, yesterdayStats.total),
      color: 'text-primary',
      bgColor: 'bg-primary-fixed',
    },
    {
      label: language === 'hi' ? 'कतार में' : 'In Queue',
      value: String(todayStats.upcoming + todayStats.inProgress),
      icon: Users,
      color: 'text-secondary',
      bgColor: 'bg-secondary-fixed',
    },
    {
      label: language === 'hi' ? 'पूरी हुई' : 'Completed',
      value: String(todayStats.completed),
      icon: Clock,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary-fixed',
    },
    {
      label: language === 'hi' ? 'आज की कमाई' : "Today's Revenue",
      value: formatPrice(todayStats.revenue),
      icon: DollarSign,
      delta: getChangeProps(todayStats.revenue, yesterdayStats.revenue),
      color: 'text-on-surface',
      bgColor: 'bg-surface-container-low',
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard — Overline Admin</title>
        <meta name="description" content="Admin dashboard for managing your Overline shop." />
      </Head>

      <div>
        {/* Header */}
        <div className="mb-8">
          <span className="label-m3 mb-2 block">{language === 'hi' ? 'अवलोकन' : 'Overview'}</span>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">{language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}</h1>
          <p className="text-on-surface-variant text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* ── Onboarding Nudge ── */}
        {!loadingServices && topServices?.length === 0 && (
          <div className="card-m3 p-6 mb-8 bg-gradient-to-r from-primary-container to-tertiary-container border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Star className="w-32 h-32 text-primary" />
            </div>
            <div className="relative z-10">
              <h2 className="text-xl font-black text-on-primary-container mb-2">Welcome to Overline! Let's get you set up.</h2>
              <p className="text-sm text-on-primary-container/80 mb-6 max-w-2xl">
                Complete these 3 simple steps to start taking bookings online and clear your shop's waiting area.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-3">1</div>
                  <h3 className="font-bold text-on-surface mb-1">Add Services</h3>
                  <p className="text-xs text-on-surface-variant">List what you offer and your prices.</p>
                </div>
                <div className="bg-surface/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                  <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold mb-3">2</div>
                  <h3 className="font-bold text-on-surface mb-1">Add Staff</h3>
                  <p className="text-xs text-on-surface-variant">Who will be providing the services?</p>
                </div>
                <div className="bg-surface/60 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                  <div className="w-8 h-8 rounded-full bg-tertiary text-white flex items-center justify-center font-bold mb-3">3</div>
                  <h3 className="font-bold text-on-surface mb-1">Share on WhatsApp</h3>
                  <p className="text-xs text-on-surface-variant">Send your booking link to your existing customers.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Metrics Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {metricCards.map((metric) => (
            <div key={metric.label} className="card-m3 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                {metric.delta && (
                  <span className={metric.delta.type === 'increase' ? 'metric-delta-up' : 'metric-delta-down'}>
                    {metric.delta.type === 'increase' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {typeof metric.delta.value === 'number' ? `${Math.abs(metric.delta.value)}%` : metric.delta.value}
                  </span>
                )}
              </div>
              <p className="metric-value">{metric.value}</p>
              <p className="metric-label mt-1">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* ── Revenue Chart ── */}
        <div className="card-m3 p-6 mb-8">
          <RevenueChart data={revenueData || []} isLoading={loadingRevenue} />
        </div>

        {/* ── Queue + Sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Today's Queue */}
          <div className="lg:col-span-8">
            <div className="card-m3 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-primary rounded-full" />
                  <h2 className="text-lg font-bold tracking-tight text-on-surface">Today&apos;s Queue</h2>
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
                  </span>
                </div>
                <button className="btn-tonal px-4 py-2 text-xs">
                  <UserPlus className="w-3.5 h-3.5" />
                  Walk-in
                </button>
              </div>

              {todayBookings?.data.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-12 h-12 text-outline-variant mx-auto mb-4" />
                  <p className="text-on-surface-variant font-medium">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayBookings?.data.slice(0, 10).map((booking) => {
                    const config = statusConfig[booking.status] || statusConfig.PENDING;
                    const trustLevel = getTrustLevel(booking.user);

                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-2xl transition-all duration-200 hover:bg-surface-container-low',
                          booking.status === 'IN_PROGRESS'
                            ? 'bg-primary-fixed/30 border border-primary/10'
                            : 'border border-outline-variant/5'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[56px]">
                            <p className="text-lg font-black text-on-surface leading-none">
                              {formatTime(booking.startTime)}
                            </p>
                          </div>
                          <div className={`w-1 h-10 rounded-full ${config.dotColor}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-on-surface text-sm">
                                {booking.user?.name || booking.customerName || 'Walk-in'}
                              </p>
                              {trustLevel === 'danger' && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-error-container text-error text-[10px] font-bold"
                                  title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}%`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                              {trustLevel === 'warning' && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold"
                                  title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}%`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {booking.services?.map((s: any) => s.serviceName).join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`badge-m3 ${
                            config.variant === 'success' ? 'bg-tertiary-fixed text-tertiary' :
                            config.variant === 'warning' ? 'bg-amber-100 text-amber-700' :
                            config.variant === 'info' ? 'bg-primary-fixed text-primary' :
                            config.variant === 'error' ? 'bg-error-container text-error' :
                            'bg-surface-container-high text-outline'
                          }`}>
                            {config.label}
                          </span>

                          {booking.status === 'CONFIRMED' && (
                            <button
                              onClick={() => startService.mutate(booking.id)}
                              className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:brightness-110 transition-all active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {booking.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => markComplete.mutate(booking.id)}
                              className="w-8 h-8 rounded-xl bg-tertiary text-white flex items-center justify-center hover:brightness-110 transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {shopId && <LiveTracking shopId={shopId} />}

            <div className="card-m3 p-6">
              <TopServicesChart data={topServices || []} isLoading={loadingServices} />
            </div>

            {/* Recent Activity */}
            <div className="card-m3 p-6">
              <h2 className="text-sm font-bold tracking-tight text-on-surface mb-5 flex items-center gap-2">
                <Bell className="w-4 h-4 text-secondary" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {(!recentActivity || recentActivity.length === 0) ? (
                  <div className="text-center py-8">
                    <Bell className="w-8 h-8 text-outline-variant mx-auto mb-2" />
                    <p className="text-xs text-on-surface-variant">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.slice(0, 5).map((activity: any) => {
                    const iconConfig = NOTIFICATION_ICONS[activity.type] || { icon: Bell, color: 'text-outline' };
                    const Icon = iconConfig.icon;

                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={cn('mt-0.5 w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center', iconConfig.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-on-surface font-medium truncate">{activity.title}</p>
                          <p className="text-[11px] text-outline mt-0.5">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
