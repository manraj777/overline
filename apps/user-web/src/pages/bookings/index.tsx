import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Calendar, Clock } from 'lucide-react';
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

  // Redirect to login if not authenticated
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
        <title>My Bookings - Overline</title>
      </Head>

      <div className="container-app py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card variant="bordered" className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Resume Active Queue</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsRefreshingSessions(true);
                loadActiveSessions();
              }}
            >
              Refresh
            </Button>
          </div>

          {isRefreshingSessions ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-gray-100 p-4">
                  <div className="h-4 w-1/2 rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active queue sessions found. Join a queue from any shop and it will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <article key={session.bookingId} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{session.shopName}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Token {session.tokenCode} • {session.aheadCount > 0 ? `${session.aheadCount} ahead` : "You're next"}
                      </p>
                      <p className="mt-1 text-xs text-primary-600">
                        {statusLabel(session.status)} • ETA {session.estimatedMinutes} min
                      </p>
                    </div>
                    <Link
                      href={`/shop/${session.shopId}`}
                      className="inline-flex rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                    >
                      Resume Tracking
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        {/* Bookings List */}
        {isLoading ? (
          <Loading text="Loading your bookings..." />
        ) : bookings?.data.length === 0 ? (
          <Card variant="bordered" className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab !== 'all' ? activeTab : ''} bookings
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'upcoming'
                ? "You don't have any upcoming appointments"
                : activeTab === 'past'
                ? "You haven't had any appointments yet"
                : "You haven't made any bookings yet"}
            </p>
            <Button onClick={() => router.push('/explore')}>
              Book an Appointment
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings?.data.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}

        {/* Auto-show Review Modal for completed bookings */}
        <ReviewModal />
      </div>
    </>
  );
}
