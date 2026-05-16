import React from 'react';
import Head from 'next/head';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Search, AlertTriangle } from 'lucide-react';
import { Card, Button, Input, Badge, Loading, useToast } from '@/components/ui';
import { useAdminBookings, useUpdateBookingStatus, useCreateWalkIn, useQueueSocket } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { formatTime, cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/hooks';

/**
 * Helper to determine trust level from score
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
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newAppt, setNewAppt] = React.useState({
    customerName: '',
    customerPhone: '',
    serviceIds: [] as string[],
    notes: '',
  });
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const { data: bookings, isLoading } = useAdminBookings({
    date: format(selectedDate, 'yyyy-MM-dd'),
    status: statusFilter,
  });

  const updateStatus = useUpdateBookingStatus();
  const createWalkIn = useCreateWalkIn();
  const { data: services } = useServices();

  // Real-time queue updates
  const shopId = (user as any)?.shopId || '';
  const { connected: wsConnected } = useQueueSocket({
    shopId,
    enabled: !!shopId,
    onQueueUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });

  const statusOptions: { value: string | undefined; label: string }[] = [
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
      booking.user?.phone?.toLowerCase().includes(search) ||
      booking.customerName?.toLowerCase().includes(search) ||
      booking.customerPhone?.toLowerCase().includes(search)
    );
  });

  const handleCreateWalkIn = async () => {
    if (!newAppt.customerName) {
      addToast({ title: 'Name required', message: 'Please enter a customer name.', type: 'error' });
      return;
    }
    if (newAppt.serviceIds.length === 0) {
      addToast({ title: 'Service required', message: 'Please select at least one service.', type: 'error' });
      return;
    }
    try {
      await createWalkIn.mutateAsync({
        customerName: newAppt.customerName,
        customerPhone: newAppt.customerPhone || undefined,
        serviceIds: newAppt.serviceIds,
        notes: newAppt.notes || undefined,
      });
      addToast({ title: 'Appointment created', type: 'success' });
      setShowNewForm(false);
      setNewAppt({ customerName: '', customerPhone: '', serviceIds: [], notes: '' });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      addToast({ title: 'Failed', message: Array.isArray(msg) ? msg[0] : msg, type: 'error' });
    }
  };

  return (
    <>
      <Head>
        <title>Appointments - Overline Admin</title>
      </Head>

      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Appointments</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-on-surface-variant text-sm">Manage your daily schedule</p>
              {wsConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                  Live
                </span>
              )}
            </div>
          </div>
          <Button onClick={() => setShowNewForm(!showNewForm)}>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>

        {/* New Appointment Form */}
        {showNewForm && (
          <div className="card-m3 p-4 sm:p-6 border-2 border-primary/20">
            <h3 className="text-sm font-bold text-on-surface mb-4">Create Walk-in Appointment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newAppt.customerName}
                  onChange={(e) => setNewAppt({ ...newAppt, customerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone</label>
                <input
                  type="tel"
                  value={newAppt.customerPhone}
                  onChange={(e) => setNewAppt({ ...newAppt, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="+91..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Services *</label>
                <div className="flex flex-wrap gap-2">
                  {(services || []).filter((s: any) => s.isActive).map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setNewAppt((prev) => ({
                          ...prev,
                          serviceIds: prev.serviceIds.includes(s.id)
                            ? prev.serviceIds.filter((id) => id !== s.id)
                            : [...prev.serviceIds, s.id],
                        }));
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        newAppt.serviceIds.includes(s.id)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                      )}
                    >
                      {s.name} — ₹{s.price}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Notes</label>
                <input
                  type="text"
                  value={newAppt.notes}
                  onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowNewForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateWalkIn} disabled={createWalkIn.isPending}>
                {createWalkIn.isPending ? 'Creating...' : 'Create Appointment'}
              </Button>
            </div>
          </div>
        )}

        {/* Date Navigation */}
        <div className="card-m3 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-2 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-on-surface" />
              </button>
              <button
                onClick={handleNextDay}
                className="p-2 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-on-surface" />
              </button>
              <span className="text-sm sm:text-lg font-semibold text-on-surface ml-2">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-3 py-2 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-outline-variant/10 overflow-x-auto pb-1 -mx-1 px-1">
            {statusOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                  statusFilter === option.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant/10'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
        {isLoading ? (
          <Loading text="Loading appointments..." />
        ) : filteredBookings?.length === 0 ? (
          <div className="card-m3 text-center py-12">
            <p className="text-on-surface-variant">No appointments found for this date</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="card-m3 overflow-hidden p-0 hidden md:block">
              <table className="w-full">
                <thead className="bg-surface-container border-b border-outline-variant/10">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Time</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Customer</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Services</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Staff</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredBookings?.map((booking) => {
                    const config = statusConfig[booking.status] || statusConfig.PENDING;
                    const trustLevel = getTrustLevel(booking.user);

                    return (
                      <tr key={booking.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-on-surface">{formatTime(booking.startTime)}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-start gap-2">
                            <div>
                              <p className="font-medium text-on-surface">
                                {booking.user?.name || booking.customerName || 'Walk-in'}
                              </p>
                              <p className="text-sm text-on-surface-variant">{booking.user?.phone || booking.customerPhone || '-'}</p>
                            </div>
                            {trustLevel === 'danger' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error/10 text-error text-xs font-medium"
                                title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}%`}>
                                <AlertTriangle className="w-3 h-3" /> Blacklisted
                              </span>
                            )}
                            {trustLevel === 'warning' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium"
                                title={`Trust Score: ${booking.user?.trustScore?.toFixed(0)}%`}>
                                <AlertTriangle className="w-3 h-3" /> High Risk
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm text-on-surface">{booking.services?.map((s) => s.serviceName).join(', ')}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-sm text-on-surface">{booking.staff?.name || 'Any'}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {renderActions(booking, updateStatus, addToast)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {filteredBookings?.map((booking) => {
                const config = statusConfig[booking.status] || statusConfig.PENDING;
                const trustLevel = getTrustLevel(booking.user);

                return (
                  <div key={booking.id} className="card-m3 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">{formatTime(booking.startTime)}</span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      {trustLevel === 'danger' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error/10 text-error text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" /> Blacklisted
                        </span>
                      )}
                      {trustLevel === 'warning' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" /> High Risk
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-medium text-on-surface">
                        {booking.user?.name || booking.customerName || 'Walk-in'}
                      </p>
                      <p className="text-xs text-on-surface-variant">{booking.user?.phone || booking.customerPhone || '-'}</p>
                      <p className="text-xs text-on-surface-variant">
                        {booking.services?.map((s) => s.serviceName).join(', ')}
                      </p>
                      <p className="text-xs text-on-surface-variant">Staff: {booking.staff?.name || 'Any'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-outline-variant/10 flex-wrap">
                      {renderActions(booking, updateStatus, addToast)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Shared action buttons renderer */
function renderActions(booking: any, updateStatus: any, addToast: any) {
  return (
    <>
      {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL' || booking.status === 'CONFIRMED') && (
        <Button
          size="sm"
          variant="ghost"
          className="text-error hover:bg-error/10 text-xs"
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
          className="text-primary border-primary/30 text-xs"
          onClick={() => {
            updateStatus.mutate({ bookingId: booking.id, status: 'CONFIRMED', adminNotes: 'APPROVED_BY_STAFF' });
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
          className="text-error border-error/30 text-xs"
          onClick={() => {
            const reason = window.prompt('Reason for disapproval:', 'DISAPPROVED_BY_STAFF') || 'DISAPPROVED_BY_STAFF';
            updateStatus.mutate({ bookingId: booking.id, status: 'REJECTED', adminNotes: reason });
            addToast({ title: 'Booking disapproved', type: 'warning' });
          }}
        >
          Disapprove
        </Button>
      )}
      {(booking.user?.phone || booking.customerPhone) && (
        <a
          href={`tel:${booking.user?.phone || booking.customerPhone}`}
          className="inline-flex items-center rounded-lg border border-outline-variant/20 px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          title="Call user"
        >
          Call
        </a>
      )}
      {booking.status === 'CONFIRMED' && (
        <Button
          size="sm"
          variant="outline"
          className="text-error border-error/30 text-xs"
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
        <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ bookingId: booking.id, status: 'CONFIRMED' })}>
          Confirm
        </Button>
      )}
      {booking.status === 'CONFIRMED' && (
        <Button size="sm" className="text-xs" onClick={() => updateStatus.mutate({ bookingId: booking.id, status: 'IN_PROGRESS' })}>
          Start
        </Button>
      )}
      {booking.status === 'IN_PROGRESS' && (
        <Button size="sm" className="text-xs" onClick={() => updateStatus.mutate({ bookingId: booking.id, status: 'COMPLETED' })}>
          Complete
        </Button>
      )}
    </>
  );
}
