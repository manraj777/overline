import React from 'react';
import Head from 'next/head';
import { format, subDays } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, Loading } from '@/components/ui';
import { useAnalytics, useDailyMetrics, usePopularServices } from '@/hooks';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { PeakHoursHeatmap } from '@/components/charts/PeakHoursHeatmap';
import { cn, formatPrice } from '@/lib/utils';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
const PIE_COLORS = ['#6366f1', '#e2e8f0'];

export default function AnalyticsPage() {
  const [range, setRange] = React.useState(30);
  const startDate = format(subDays(new Date(), range), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics({
    startDate,
    endDate,
  });
  const { data: dailyMetrics, isLoading: loadingDaily } = useDailyMetrics({
    startDate,
    endDate,
  });
  const { data: topServices, isLoading: loadingServices } = usePopularServices();

  if (loadingAnalytics) {
    return <Loading text="Loading analytics..." />;
  }

  const summary = analytics?.summary || {};
  const revenue = analytics?.revenue || {};
  const performance = analytics?.performance || {};
  const byDayOfWeek = analytics?.byDayOfWeek || [];

  // Build hour counts from performance data
  const hourCounts: Record<number, number> = {};
  if (performance.peakHour !== null) {
    // Simulate distribution around peak hour
    for (let h = 7; h <= 22; h++) {
      const dist = Math.abs(h - (performance.peakHour || 12));
      hourCounts[h] = Math.max(1, Math.round(performance.peakHourBookings * Math.exp(-dist * 0.3)));
    }
  }

  const completionData = [
    { name: 'Completed', value: summary.completedBookings || 0 },
    { name: 'Other', value: Math.max(0, (summary.totalBookings || 0) - (summary.completedBookings || 0)) },
  ];

  return (
    <>
      <Head>
        <title>Analytics - Overline Admin</title>
      </Head>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500">Performance insights for your shop</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  range === r.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: summary.totalBookings || 0 },
            { label: 'Completed', value: summary.completedBookings || 0 },
            { label: 'Cancelled', value: summary.cancelledBookings || 0 },
            { label: 'Total Revenue', value: formatPrice(revenue.total || 0) },
            { label: 'Avg Wait', value: `${performance.averageWaitMinutes || 0}m` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="mb-8">
          <RevenueChart data={dailyMetrics || []} isLoading={loadingDaily} />
        </div>

        {/* Two-column: Heatmap + Completion Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8">
            <PeakHoursHeatmap
              data={byDayOfWeek}
              hourCounts={hourCounts}
              isLoading={loadingAnalytics}
            />
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Completion Rate</h3>
              <p className="text-sm text-gray-500 mb-4">
                {(summary.completionRate || 0).toFixed(1)}% of bookings completed
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {completionData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-xs text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  <span className="text-xs text-gray-600">Other</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">No-show rate</span>
                  <span className="font-medium text-gray-900">
                    {(summary.noShowRate || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg ticket</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(revenue.average || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Breakdown Table */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Performance</h3>
          {loadingServices ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : !topServices?.length ? (
            <p className="text-gray-400 text-center py-8">No service data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 pr-4">Service</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase pb-3 px-4">Bookings</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase pb-3 px-4">Revenue</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase pb-3 pl-4">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((service: any, i: number) => {
                    const totalBookings = topServices.reduce(
                      (s: number, sv: any) => s + sv.bookingCount,
                      0
                    );
                    const share =
                      totalBookings > 0
                        ? ((service.bookingCount / totalBookings) * 100).toFixed(0)
                        : '0';
                    return (
                      <tr key={service.serviceId || i} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {service.serviceName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right text-sm text-gray-700 py-3 px-4">
                          {service.bookingCount}
                        </td>
                        <td className="text-right text-sm font-medium text-gray-900 py-3 px-4">
                          {formatPrice(service.revenue)}
                        </td>
                        <td className="text-right py-3 pl-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${share}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
