import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Store, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAuth } from '@/lib/auth';
import { platformApi } from '@/lib/api';

export default function ShopsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, authLoading]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platform-shops', page, search],
    queryFn: async () => {
      const { data } = await platformApi.getShops({ page, limit, search: search || undefined });
      return data;
    },
    enabled: isAuthenticated,
  });

  const shops = data?.shops || data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await platformApi.toggleShopActive(id, !current);
      refetch();
    } catch { /* ignore */ }
  };

  if (authLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <Head><title>Shops — Overline Super Admin</title></Head>
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Shops</h1>
            <p className="text-sm text-gray-500 font-medium">{total} registered shops</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by shop name or city..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">Loading...</div>
          ) : shops.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">No shops found</div>
          ) : (
            shops.map((s: any) => (
              <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-gray-400" />
                        <p className="text-[11px] text-gray-400 font-medium">{s.city || s.address || 'No location'}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleToggle(s.id, s.isActive)} title={s.isActive ? 'Deactivate' : 'Activate'}>
                    {s.isActive ? (
                      <ToggleRight size={24} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={24} className="text-gray-300" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <div>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{s._count?.bookings ?? s.bookingCount ?? '—'}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Bookings</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{s._count?.staff ?? s.staffCount ?? '—'}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Staff</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{s._count?.services ?? s.serviceCount ?? '—'}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Services</p>
                  </div>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${
                    s.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {s.isActive ? 'LIVE' : 'OFF'}
                  </span>
                </div>

                {s.owner && (
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[9px] font-black text-gray-500">
                      {s.owner.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium truncate">{s.owner.name} — {s.owner.email || s.owner.phone}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-gray-400 font-medium">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-all">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
