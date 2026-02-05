import React from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { Card, StatCard, Loading } from '@/components/ui';
import { useAnalytics, usePopularServices } from '@/hooks';
import { formatPrice, cn } from '@/lib/utils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState<'week' | 'month'>('week');
  const { data: analytics, isLoading: loadingAnalytics } = useAnalytics({ period });
  const { data: popularServices, isLoading: loadingServices } = usePopularServices();

  if (loadingAnalytics || loadingServices) {
    return <Loading text="Loading analytics..." />;
  }

  // Mock data for demonstration
  const revenueData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue',
        data: [4500, 5200, 4800, 6100, 7200, 8500, 6800],
        backgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const bookingsData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Bookings',
        data: [12, 15, 13, 18, 22, 28, 20],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const servicesData = {
    labels: ['Haircut', 'Beard Trim', 'Hair Color', 'Facial', 'Massage'],
    datasets: [
      {
        data: [35, 25, 18, 12, 10],
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(217, 70, 239, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
      },
    ],
  };

  const stats = analytics || {
    totalBookings: 156,
    totalRevenue: 45200,
    newCustomers: 28,
    avgRating: 4.8,
  };

  return (
    <>
      <Head>
        <title>Analytics - Overline Admin</title>
      </Head>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500">Track your business performance</p>
          </div>

          <div className="flex gap-2">
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  period === p
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={Calendar}
            change={{ value: 12, type: 'increase' }}
          />
          <StatCard
            title="Revenue"
            value={formatPrice(stats.totalRevenue)}
            icon={DollarSign}
            iconColor="bg-green-100 text-green-600"
            change={{ value: 18, type: 'increase' }}
          />
          <StatCard
            title="New Customers"
            value={stats.newCustomers}
            icon={Users}
            iconColor="bg-purple-100 text-purple-600"
            change={{ value: 8, type: 'increase' }}
          />
          <StatCard
            title="Avg Rating"
            value={stats.avgRating}
            icon={TrendingUp}
            iconColor="bg-amber-100 text-amber-600"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue</h2>
            <div className="h-64">
              <Bar
                data={revenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${value}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </Card>

          {/* Bookings Chart */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings Trend</h2>
            <div className="h-64">
              <Line
                data={bookingsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Popular Services */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Services</h2>
            <div className="h-48">
              <Doughnut
                data={servicesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            </div>
          </Card>

          {/* Top Services List */}
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Performance</h2>
            <div className="space-y-4">
              {[
                { name: 'Haircut', bookings: 45, revenue: 13500, growth: 12 },
                { name: 'Beard Trim', bookings: 32, revenue: 6400, growth: 8 },
                { name: 'Hair Color', bookings: 23, revenue: 18400, growth: 15 },
                { name: 'Facial', bookings: 15, revenue: 7500, growth: -5 },
                { name: 'Massage', bookings: 12, revenue: 9600, growth: 3 },
              ].map((service, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm w-6">#{i + 1}</span>
                    <span className="font-medium text-gray-900">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <span className="text-gray-500">{service.bookings} bookings</span>
                    <span className="font-medium text-gray-900 w-20 text-right">
                      {formatPrice(service.revenue)}
                    </span>
                    <span
                      className={cn(
                        'w-12 text-right',
                        service.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {service.growth >= 0 ? '+' : ''}{service.growth}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
