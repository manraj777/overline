import React from 'react';
import Head from 'next/head';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Plus, Search, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Card, Button, Input, Badge, Loading, useToast } from '@/components/ui';
import { useAdminBookings, useUpdateBookingStatus, useQueueSocket } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { formatTime, cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Helper to determine trust level from score
 * - High Risk: score < 40% - Show warning
 * - Blacklisted: score < 10% with > 5 bookings - Show danger
 */
function getTrustLevel(user: any): 'normal' | 'warning' | 'danger' | null {
  if (!user) return null;
  const score = user.trustScore ?? 100;
  const totalBookings = user.totalBookings ?? 0;
  
  if (score < 10 && totalBookings > 5) return 'danger';
  if (score < 40) return 'warning';
  return 'normal';
}

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [statusFilter, setStatusFilter] = React.useState<string | undefined>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const { data: bookings, isLoading } = useAdminBookings({
    date: format(selectedDate, 'yyyy-MM-dd'),
    status: statusFilter,
  });

  const updateStatus = useUpdateBookingStatus();

  // Real-time queue updates — auto-refresh bookings when queue changes
  const shopId = (user as any)?.shopId || '';
  const { connected: wsConnected } = useQueueSocket({
    shopId,
    enabled: !!shopId,
    onQueueUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });

  const statusOptions = [
    { value: undefined, label: 'All' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
    PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
    PENDING: { label: 'Pending', variant: 'warning' },
    CONFIRMED: { label: 'Confirmed', variant: 'info' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'error' },
    NO_SHOW: { label: 'No Show', variant: 'error' },
    REJECTED: { label: 'Disapproved', variant: 'error' },
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
            <div className="flex items-center gap-2">
              <p className="text-gray-500">Manage your daily schedule</p>
              {wsConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  Live
                </span>
              )}
            </div>
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
                  const trustLevel = getTrustLevel(booking.user);

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {formatTime(booking.startTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {booking.user?.name || booking.customerName || 'Walk-in'}
                            </p>
                            <p className="text-sm text-gray-500">{booking.user?.phone || booking.customerPhone || '-'}</p>
                          </div>
                          {/* Trust Score Warning Indicators */}
                          {trustLevel === 'danger' && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium"
                              title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}% - ${booking.user?.noShowBookings} no-shows out of ${booking.user?.totalBookings} bookings`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Blacklisted
                            </span>
                          )}
                          {trustLevel === 'warning' && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium"
                              title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}% - Frequent no-shows`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              High Risk
                            </span>
                          )}
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
                          {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL' || booking.status === 'CONFIRMED') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-error hover:bg-error/10"
                              onClick={() => {
                                if (window.confirm('Cancel this appointment?')) {
                                  updateStatus.mutate({ bookingId: booking.id, status: 'CANCELLED' });
                                  addToast({ title: 'Appointment cancelled', type: 'info' });
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                          {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300"
                              onClick={() => {
                                updateStatus.mutate({
                                  bookingId: booking.id,
                                  status: 'CONFIRMED',
                                  adminNotes: 'APPROVED_BY_STAFF',
                                });
                                addToast({ title: 'Booking approved', type: 'success' });
                              }}
                            >
                              Approve
                            </Button>
                          )}
                          {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300"
                              onClick={() => {
                                const reason = window.prompt('Reason for disapproval:', 'DISAPPROVED_BY_STAFF') || 'DISAPPROVED_BY_STAFF';
                                updateStatus.mutate({
                                  bookingId: booking.id,
                                  status: 'REJECTED',
                                  adminNotes: reason,
                                });
                                addToast({ title: 'Booking disapproved', type: 'warning' });
                              }}
                            >
                              Disapprove
                            </Button>
                          )}
                          {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-700 border-orange-300"
                              onClick={() => {
                                updateStatus.mutate({
                                  bookingId: booking.id,
                                  status: 'REJECTED',
                                  adminNotes: 'FAKE_USER',
                                });
                                addToast({ title: 'Marked as fake user', type: 'warning' });
                              }}
                            >
                              Fake User
                            </Button>
                          )}
                          {(booking.user?.phone || booking.customerPhone) && (
                            <a
                              href={`tel:${booking.user?.phone || booking.customerPhone}`}
                              className="inline-flex items-center rounded-md border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                              title="Call user for confirmation"
                            >
                              Call User
                            </a>
                          )}
                          {booking.status === 'CONFIRMED' && (
                             <Button
                              size="sm"
                              variant="outline"
                              className="text-error"
                              onClick={() => {
                                if (window.confirm('Mark customer as No-Show?')) {
                                  updateStatus.mutate({ bookingId: booking.id, status: 'NO_SHOW' });
                                  addToast({ title: 'Marked as No-Show', type: 'warning' });
                                }
                              }}
                            >
                              No-Show
                            </Button>
                          )}
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
