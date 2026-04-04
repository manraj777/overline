import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Calendar, Clock, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { Button, Card, Loading } from '@/components/ui';
import { BookingCard } from '@/components/booking';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { useMyBookings } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import {
  DUMMY_SHOPS,
  estimateWaitMinutes,
  mapBackendBookingStatus,
  statusLabel,
  type QueueEntryStatus,
} from '@/lib/queue';
import {
  getAllQueueSessions,
  removeQueueSession,
  type ActiveQueueSession,
} from '@/lib/queue-session';

type FilterTab = 'upcoming' | 'past' | 'cancelled' | 'all';

interface RecoveredQueueSession extends ActiveQueueSession {
  shopName: string;
  aheadCount: number;
  estimatedMinutes: number;
  status: QueueEntryStatus;
}

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<FilterTab>('upcoming');
  const [activeSessions, setActiveSessions] = React.useState<RecoveredQueueSession[]>([]);
  const [isRefreshingSessions, setIsRefreshingSessions] = React.useState(true);

  const { data: bookings, isLoading } = useMyBookings(
    activeTab === 'all' ? undefined : activeTab
  );

  const averageMinutesByShop = React.useMemo(
    () =>
      DUMMY_SHOPS.reduce<Record<string, number>>((acc, shop) => {
        acc[shop.id] = shop.averageServiceMinutes;
        return acc;
      }, {}),
    [],
  );

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/bookings');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadActiveSessions = React.useCallback(async () => {
    const rawSessions = getAllQueueSessions();
    if (rawSessions.length === 0) {
      setActiveSessions([]);
      setIsRefreshingSessions(false);
      return;
    }

    const hydrated = await Promise.all(
      rawSessions.map(async (session): Promise<RecoveredQueueSession | null> => {
        let aheadCount = 0;
        let status: QueueEntryStatus = 'waiting';

        const [positionResult, bookingResult] = await Promise.allSettled([
          api.get<{ position: number }>(`/queue/position/${session.bookingId}`),
          api.get<{ status: string }>(`/bookings/${session.bookingId}`),
        ]);

        if (positionResult.status === 'fulfilled') {
          aheadCount = Math.max(0, (positionResult.value.data.position || 1) - 1);
        }

        if (bookingResult.status === 'fulfilled') {
          const backendStatus = bookingResult.value.data.status;
          if (backendStatus === 'COMPLETED' || backendStatus === 'CANCELLED' || backendStatus === 'NO_SHOW') {
            removeQueueSession(session.shopId);
            return null;
          }
          status = mapBackendBookingStatus(backendStatus);
        }

        const shop = DUMMY_SHOPS.find((item) => item.id === session.shopId);
        const averageServiceMinutes = averageMinutesByShop[session.shopId] ?? 20;

        return {
          ...session,
          aheadCount,
          status,
          estimatedMinutes: estimateWaitMinutes(aheadCount, averageServiceMinutes),
          shopName: shop?.name ?? 'Active Queue',
        };
      }),
    );

    setActiveSessions(hydrated.filter((session): session is RecoveredQueueSession => !!session));
    setIsRefreshingSessions(false);
  }, [averageMinutesByShop]);

  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let mounted = true;

    const refresh = async () => {
      if (!mounted) return;
      await loadActiveSessions();
    };

    refresh();
    const interval = window.setInterval(refresh, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [authLoading, isAuthenticated, loadActiveSessions]);

  if (authLoading || !isAuthenticated) {
    return <Loading text="Loading..." />;
  }

  const tabs: { value: FilterTab; label: string }[] = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'all', label: 'All' },
  ];

  return (
    <>
      <Head>
        <title>My Bookings — Overline</title>
        <meta name="description" content="View and manage your Overline bookings and queue sessions." />
      </Head>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="label-m3 mb-2 block">Manage</span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">My Bookings</h1>
          </div>
          <Link href="/explore">
            <button className="btn-primary px-6 py-3 flex items-center gap-2 text-sm">
              <Search className="w-4 h-4" />
              Book New
            </button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95',
                activeTab === tab.value
                  ? 'bg-primary text-white shadow-button'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Queue Sessions */}
        <div className="card-m3 p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-tertiary rounded-full" />
              <h2 className="text-lg font-bold tracking-tight text-on-surface">Active Queue</h2>
            </div>
            <button
              onClick={() => {
                setIsRefreshingSessions(true);
                loadActiveSessions();
              }}
              className="btn-tonal px-4 py-2 text-xs flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {isRefreshingSessions ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-surface-container-low p-5 animate-shimmer">
                  <div className="h-4 w-1/2 rounded bg-surface-container-high mb-3" />
                  <div className="h-3 w-1/3 rounded bg-surface-container-high" />
                </div>
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-2">
              No active queue sessions. Join a queue from any shop to track it here.
            </p>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <article
                  key={session.bookingId}
                  className="rounded-2xl bg-surface-container-low p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-surface-container transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-on-surface text-base">{session.shopName}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Token <span className="font-bold text-primary">{session.tokenCode}</span> •{' '}
                      {session.aheadCount > 0 ? `${session.aheadCount} ahead` : "You're next!"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="bg-tertiary-fixed text-tertiary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        {statusLabel(session.status)}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ETA {session.estimatedMinutes} min
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/bookings/${session.bookingId}`}
                    className="btn-primary px-5 py-2.5 text-xs flex items-center gap-1"
                  >
                    Resume <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <Loading text="Loading your bookings..." />
        ) : bookings?.data.length === 0 ? (
          <div className="card-m3 text-center py-16 px-8">
            <Calendar className="w-14 h-14 text-outline-variant mx-auto mb-5" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              No {activeTab !== 'all' ? activeTab : ''} bookings
            </h3>
            <p className="text-on-surface-variant mb-6 max-w-xs mx-auto">
              {activeTab === 'upcoming'
                ? "You don't have any upcoming appointments"
                : activeTab === 'past'
                  ? "You haven't had any appointments yet"
                  : "You haven't made any bookings yet"}
            </p>
            <button onClick={() => router.push('/explore')} className="btn-primary px-8 py-3">
              Book an Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings?.data.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}

        <ReviewModal />
      </div>
    </>
  );
}
