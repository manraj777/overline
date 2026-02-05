import React from 'react';
import Head from 'next/head';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Plus, Search } from 'lucide-react';
import { Card, Button, Input, Badge, Loading } from '@/components/ui';
import { useAdminBookings, useUpdateBookingStatus } from '@/hooks';
import { formatTime, cn } from '@/lib/utils';

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [statusFilter, setStatusFilter] = React.useState<string | undefined>();
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: bookings, isLoading } = useAdminBookings({
    date: format(selectedDate, 'yyyy-MM-dd'),
    status: statusFilter,
  });

  const updateStatus = useUpdateBookingStatus();

  const statusOptions = [
    { value: undefined, label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    CONFIRMED: { label: 'Confirmed', variant: 'info' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'error' },
    NO_SHOW: { label: 'No Show', variant: 'error' },
  };

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const filteredBookings = bookings?.data.filter((booking) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      booking.user?.name?.toLowerCase().includes(search) ||
      booking.user?.phone?.toLowerCase().includes(search)
    );
  });

  return (
    <>
      <Head>
        <title>Appointments - Overline Admin</title>
      </Head>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-500">Manage your daily schedule</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>

        {/* Date Navigation */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextDay}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold text-gray-900 ml-2">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Input
                placeholder="Search customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            {statusOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === option.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Appointments List */}
        {isLoading ? (
          <Loading text="Loading appointments..." />
        ) : filteredBookings?.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500">No appointments found</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings?.map((booking) => {
                  const config = statusConfig[booking.status] || statusConfig.PENDING;

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {formatTime(booking.startTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.user?.name || 'Walk-in'}
                          </p>
                          <p className="text-sm text-gray-500">{booking.user?.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {booking.services?.map((s) => s.serviceName).join(', ')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {booking.staff?.name || 'Any'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {booking.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatus.mutate({
                                  bookingId: booking.id,
                                  status: 'CONFIRMED',
                                })
                              }
                            >
                              Confirm
                            </Button>
                          )}
                          {booking.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  bookingId: booking.id,
                                  status: 'IN_PROGRESS',
                                })
                              }
                            >
                              Start
                            </Button>
                          )}
                          {booking.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  bookingId: booking.id,
                                  status: 'COMPLETED',
                                })
                              }
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
