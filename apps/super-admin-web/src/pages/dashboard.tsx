import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';
import { Users, Store, Calendar, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAuth } from '@/lib/auth';
import { platformApi } from '@/lib/api';

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">{title}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading]);

  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data } = await platformApi.getStats();
      return data;
    },
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard — Overline Super Admin</title>
      </Head>
      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Monitor all tenants, users, and activity</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={stats?.totalUsers ?? '—'} icon={Users} color="bg-blue-500" />
          <StatCard title="Active Shops" value={stats?.totalShops ?? '—'} icon={Store} color="bg-emerald-500" />
          <StatCard title="Total Bookings" value={stats?.totalBookings ?? '—'} icon={Calendar} color="bg-amber-500" />
          <StatCard title="Revenue (₹)" value={stats?.totalRevenue ? `₹${Number(stats.totalRevenue).toLocaleString()}` : '—'} icon={TrendingUp} color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Recent Signups</h3>
            {stats?.recentUsers?.length ? (
              <div className="space-y-3">
                {stats.recentUsers.slice(0, 5).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{u.name || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-400">{u.email || u.phone}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">{u.role}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data yet</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Recent Shops</h3>
            {stats?.recentShops?.length ? (
              <div className="space-y-3">
                {stats.recentShops.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-black">
                      <Store size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400">{s.city || s.address || 'No location'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data yet</p>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
