import React from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  Play,
  Check,
  X,
} from 'lucide-react';
import { Card, Badge, Button, StatCard, Loading } from '@/components/ui';
import { useDashboard, useAdminBookings, useStartService, useMarkComplete } from '@/hooks';
import { formatTime, formatPrice, cn } from '@/lib/utils';
import { BookingStatus } from '@overline/shared';

export default function DashboardPage() {
  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: todayBookings, isLoading: loadingBookings } = useAdminBookings({
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const startService = useStartService();
  const markComplete = useMarkComplete();

  if (loadingDashboard || loadingBookings) {
    return <Loading text="Loading dashboard..." />;
  }

  const stats = dashboard || {
    todayBookings: 0,
    currentQueue: 0,
    avgWaitTime: 0,
    revenue: 0,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Today's Appointments"
            value={stats.todayBookings}
            icon={Calendar}
            change={{ value: 12, type: 'increase' }}
          />
          <StatCard
            title="In Queue"
            value={stats.currentQueue}
            icon={Users}
            iconColor="bg-amber-100 text-amber-600"
          />
          <StatCard
            title="Avg Wait Time"
            value={`${stats.avgWaitTime} min`}
            icon={Clock}
            iconColor="bg-purple-100 text-purple-600"
          />
          <StatCard
            title="Today's Revenue"
            value={formatPrice(stats.revenue)}
            icon={DollarSign}
            iconColor="bg-green-100 text-green-600"
            change={{ value: 8, type: 'increase' }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Queue */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Today's Queue</h2>
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
                  {todayBookings?.data.slice(0, 8).map((booking) => {
                    const config = statusConfig[booking.status] || statusConfig.PENDING;

                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border',
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
                            <p className="font-medium text-gray-900">
                              {booking.user?.name || 'Walk-in'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.services?.map((s) => s.serviceName).join(', ')}
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

          {/* Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Walk-in Customer
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Block Time Slot
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  { action: 'New booking', time: '2 min ago', user: 'John Doe' },
                  { action: 'Service completed', time: '15 min ago', user: 'Jane Smith' },
                  { action: 'Booking cancelled', time: '1 hour ago', user: 'Mike Johnson' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                    <div>
                      <p className="text-sm text-gray-900">
                        {activity.action}: <span className="font-medium">{activity.user}</span>
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
