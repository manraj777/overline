import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Bell, CheckCheck, CalendarClock } from 'lucide-react';
import { Loading } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  booking?: {
    id: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);
  const [items, setItems] = React.useState<NotificationItem[]>([]);

  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/notifications', {
        params: { page: 1, limit: 50 },
      });
      setItems(Array.isArray(data?.data) ? data.data : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/notifications');
    }
  }, [authLoading, isAuthenticated, router]);

  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadNotifications();
  }, [authLoading, isAuthenticated, loadNotifications]);

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    loadNotifications();
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (!item.readAt) {
      await api.patch(`/notifications/${item.id}/read`);
    }

    if (item.booking?.id) {
      router.push(`/bookings/${item.booking.id}`);
      return;
    }

    loadNotifications();
  };

  if (authLoading || !isAuthenticated || isLoading) {
    return <Loading text="Loading notifications..." />;
  }

  return (
    <>
      <Head>
        <title>Notifications — Overline</title>
      </Head>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-2">Updates</p>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Notifications</h1>
          </div>
          <button onClick={markAllAsRead} className="btn-tonal px-4 py-2 text-sm flex items-center gap-2">
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        </div>

        {items.length === 0 ? (
          <div className="card-m3 p-10 text-center">
            <Bell className="w-12 h-12 text-outline-variant mx-auto mb-4" />
            <p className="text-lg font-bold text-on-surface mb-1">No notifications yet</p>
            <p className="text-on-surface-variant">We will notify you about bookings, reminders, and updates here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleOpenNotification(item)}
                className={`w-full text-left rounded-2xl p-5 border transition-colors ${
                  item.readAt
                    ? 'bg-surface-container-low border-outline-variant/10'
                    : 'bg-primary-fixed/20 border-primary-fixed hover:bg-primary-fixed/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-on-surface">{item.title}</p>
                    <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{item.body}</p>
                  </div>
                  {!item.readAt && <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />}
                </div>
                <div className="mt-3 text-xs text-outline flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
