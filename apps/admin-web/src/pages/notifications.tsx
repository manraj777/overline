import React from 'react';
import Head from 'next/head';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks';
import { Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Loading } from '@/components/ui';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const [filter, setFilter] = React.useState<'ALL' | 'UNREAD'>('ALL');
  const { data: notificationsData, isLoading, error } = useNotifications({
    limit: 50,
    unreadOnly: filter === 'UNREAD',
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsData?.data || [];

  const handleMarkRead = (id: string, isRead: boolean) => {
    if (!isRead && !markRead.isPending) {
      markRead.mutate(id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-tertiary" />;
      case 'BOOKING_REMINDER':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <>
      <Head>
        <title>Notifications — Overline Admin</title>
        <meta name="description" content="View and manage admin notifications." />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="label-m3 mb-2 block">Alerts</span>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Notifications</h1>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-surface-container-low rounded-xl p-1 border border-outline-variant/10">
              {(['ALL', 'UNREAD'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-2 text-xs font-bold rounded-lg transition-all',
                    filter === f
                      ? 'bg-primary text-white shadow-button'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  {f === 'ALL' ? 'All' : 'Unread'}
                </button>
              ))}
            </div>
            <button
              onClick={() => markAllRead.mutate()}
              disabled={notifications.length === 0 || markAllRead.isPending}
              className="btn-tonal px-4 py-2.5 text-xs disabled:opacity-50"
            >
              {markAllRead.isPending ? 'Marking...' : 'Mark All Read'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-error-container/50 border border-error/20 text-error text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Failed to load notifications. Please try again.</span>
          </div>
        )}

        {/* List */}
        <div className="card-m3 overflow-hidden">
          {isLoading ? (
            <div className="p-8 pb-12">
              <Loading text="Loading notifications..." />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center mb-5">
                <Bell className="w-8 h-8 text-outline-variant" />
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-1">You&apos;re all caught up!</h3>
              <p className="text-on-surface-variant text-sm max-w-sm">
                No new notifications right now. Check back later.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, idx) => {
                const isRead = !!notification.readAt;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-5 flex gap-4 cursor-pointer transition-colors',
                      !isRead ? 'bg-primary-fixed/20' : 'hover:bg-surface-container-low',
                      idx !== notifications.length - 1 && 'border-b border-outline-variant/5'
                    )}
                    onClick={() => handleMarkRead(notification.id, isRead)}
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                        <h4 className={cn('text-sm font-semibold truncate', !isRead ? 'text-on-surface' : 'text-on-surface-variant')}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] font-bold text-outline whitespace-nowrap tracking-widest uppercase">
                          {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className={cn('text-sm', !isRead ? 'text-on-surface' : 'text-on-surface-variant')}>
                        {notification.body}
                      </p>
                      {notification.data?.bookingNumber && (
                        <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/10 text-[10px] font-bold text-on-surface-variant">
                          Ref: {notification.data.bookingNumber}
                        </span>
                      )}
                    </div>
                    {!isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
