import React from 'react';
import Head from 'next/head';
import { format, subDays } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Loading } from '@/components/ui';
import { useAnalytics, useDailyMetrics, usePopularServices } from '@/hooks';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { PeakHoursHeatmap } from '@/components/charts/PeakHoursHeatmap';
import { cn, formatPrice } from '@/lib/utils';

const COLORS = ['#4648d4', '#6b38d4', '#8455ef', '#a3a5ff', '#c7caff'];
const PIE_COLORS = ['#4648d4', '#e5eeff'];

export default function AnalyticsPage() {
  const [range, setRange] = React.useState(30);
  const startDate = format(subDays(new Date(), range), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics({ startDate, endDate });
  const { data: dailyMetrics, isLoading: loadingDaily } = useDailyMetrics({ startDate, endDate });
  const { data: topServices, isLoading: loadingServices } = usePopularServices();

  if (loadingAnalytics) {
    return <Loading text="Loading analytics..." />;
  }

  const summary = analytics?.summary || {};
  const revenue = analytics?.revenue || {};
  const performance = analytics?.performance || {};
  const byDayOfWeek = analytics?.byDayOfWeek || [];

  const hourCounts: Record<number, number> = {};
  if (performance.peakHour !== null) {
    for (let h = 7; h <= 22; h++) {
      const dist = Math.abs(h - (performance.peakHour || 12));
      hourCounts[h] = Math.max(1, Math.round(performance.peakHourBookings * Math.exp(-dist * 0.3)));
    }
  }

  const completionData = [
    { name: 'Completed', value: summary.completedBookings || 0 },
    { name: 'Other', value: Math.max(0, (summary.totalBookings || 0) - (summary.completedBookings || 0)) },
  ];

  const summaryCards = [
    { label: 'Total Bookings', value: summary.totalBookings || 0 },
    { label: 'Completed', value: summary.completedBookings || 0 },
    { label: 'Cancelled', value: summary.cancelledBookings || 0 },
    { label: 'Total Revenue', value: formatPrice(revenue.total || 0) },
    { label: 'Avg Wait', value: `${performance.averageWaitMinutes || 0}m` },
  ];

  return (
    <>
      <Head>
        <title>Analytics — Overline Admin</title>
        <meta name="description" content="Analytics and performance insights for your Overline shop." />
      </Head>

      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="label-m3 mb-2 block">Insights</span>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Analytics</h1>
            <p className="text-on-surface-variant text-sm mt-1">Performance insights for your shop</p>
          </div>
          <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 border border-outline-variant/10">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '90D', value: 90 },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  'px-4 py-2 text-xs font-bold rounded-lg transition-all',
                  range === r.value
                    ? 'bg-primary text-white shadow-button'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {summaryCards.map((stat) => (
            <div key={stat.label} className="card-m3 p-5">
              <p className="metric-label mb-2">{stat.label}</p>
              <p className="metric-value">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="card-m3 p-6 mb-8">
          <RevenueChart data={dailyMetrics || []} isLoading={loadingDaily} />
        </div>

        {/* Heatmap + Completion Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-8">
            <div className="card-m3 p-6">
              <PeakHoursHeatmap data={byDayOfWeek} hourCounts={hourCounts} isLoading={loadingAnalytics} />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="card-m3 p-6 h-full">
              <h3 className="text-sm font-bold tracking-tight text-on-surface mb-1">Completion Rate</h3>
              <p className="text-xs text-on-surface-variant mb-4">
                {(summary.completionRate || 0).toFixed(1)}% of bookings completed
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={completionData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {completionData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-on-surface-variant">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-surface-container" />
                  <span className="text-[10px] font-bold text-on-surface-variant">Other</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant text-xs font-medium">No-show rate</span>
                  <span className="font-bold text-on-surface text-sm">{(summary.noShowRate || 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant text-xs font-medium">Avg ticket</span>
                  <span className="font-bold text-on-surface text-sm">{formatPrice(revenue.average || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Performance Table */}
        <div className="card-m3 p-6">
          <h3 className="text-sm font-bold tracking-tight text-on-surface mb-5 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-secondary rounded-full" />
            Service Performance
          </h3>
          {loadingServices ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 skeleton" />
              ))}
            </div>
          ) : !topServices?.length ? (
            <p className="text-on-surface-variant text-center py-8 text-sm">No service data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-m3">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th className="text-right">Bookings</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((service: any, i: number) => {
                    const totalBookings = topServices.reduce((s: number, sv: any) => s + sv.bookingCount, 0);
                    const share = totalBookings > 0 ? ((service.bookingCount / totalBookings) * 100).toFixed(0) : '0';
                    return (
                      <tr key={service.serviceId || i}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-medium">{service.serviceName}</span>
                          </div>
                        </td>
                        <td className="text-right text-on-surface-variant">{service.bookingCount}</td>
                        <td className="text-right font-bold">{formatPrice(service.revenue)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${share}%`, backgroundColor: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-outline w-8 text-right">{share}%</span>
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
