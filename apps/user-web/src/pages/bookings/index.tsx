import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Calendar, Clock } from 'lucide-react';
import { Button, Card, Loading } from '@/components/ui';
import { BookingCard } from '@/components/booking';
import { useMyBookings } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

type FilterTab = 'upcoming' | 'past' | 'all';

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<FilterTab>('upcoming');

  const { data: bookings, isLoading } = useMyBookings(
    activeTab === 'all' ? undefined : activeTab
  );

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/bookings');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
    return <Loading text="Loading..." />;
  }

  const tabs: { value: FilterTab; label: string }[] = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
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
      </div>
    </>
  );
}
