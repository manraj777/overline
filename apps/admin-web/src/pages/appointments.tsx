import React from 'react';
import Head from 'next/head';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Search, AlertTriangle, User, Phone, Clock, MapPin, MessageSquare, Star, XCircle, CheckCircle2, CircleDot, Ban } from 'lucide-react';
import { Card, Button, Input, Badge, Loading, useToast } from '@/components/ui';
import { useAdminBookings, useUpdateBookingStatus, useCreateWalkIn, useQueueSocket } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { formatTime, cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';
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
  const [expandedBookingId, setExpandedBookingId] = React.useState<string | null>(null);
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
  const { play: playSound } = useNotificationSound();

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
    if (newAppt.customerPhone && !/^\d{10}$/.test(newAppt.customerPhone)) {
      addToast({ title: 'Invalid Phone', message: 'Phone number must be exactly 10 digits.', type: 'error' });
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
                  onChange={(e) => setNewAppt({ ...newAppt, customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="9876543210"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBookings?.map((booking) => {
                const config = statusConfig[booking.status] || statusConfig.PENDING;
                const trustLevel = getTrustLevel(booking.user);
                const isExpanded = expandedBookingId === booking.id;
                const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REJECTED' || booking.status === 'NO_SHOW';

                return (
                  <div key={booking.id} className={cn(
                    "card-m3 overflow-hidden transition-all duration-200",
                    isExpanded && "ring-1 ring-primary/30",
                    isCancelled && "opacity-70"
                  )}>
                    {/* Collapsed summary – always visible, click to expand */}
                    <button
                      className="w-full p-4 text-left"
                      onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {booking.user?.avatarUrl ? (
                              <img src={booking.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-on-surface truncate">
                              {booking.user?.name || booking.customerName || 'Walk-in'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-bold text-on-surface-variant">{formatTime(booking.startTime)}</span>
                              <span className="text-[10px] text-on-surface-variant">•</span>
                              <span className="text-xs text-on-surface-variant truncate">
                                {booking.services?.map((s: any) => s.serviceName).join(', ') || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={config.variant}>{config.label}</Badge>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-on-surface-variant" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                          )}
                        </div>
                      </div>

                      {/* Trust level warning inline */}
                      {trustLevel === 'danger' && (
                        <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-lg bg-error/10 w-fit">
                          <AlertTriangle className="w-3 h-3 text-error" />
                          <span className="text-[10px] font-bold text-error">Blacklisted User</span>
                        </div>
                      )}
                      {trustLevel === 'warning' && (
                        <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-lg bg-amber-500/10 w-fit">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">High Risk</span>
                        </div>
                      )}
                    </button>

                    {/* Expanded detail section */}
                    {isExpanded && (
                      <div className="border-t border-outline-variant/10">
                        {/* User Profile Section */}
                        <div className="p-4 space-y-3">
                          <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Customer Details</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low">
                              <User className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-on-surface-variant">Name</p>
                                <p className="text-xs font-semibold text-on-surface truncate">{booking.user?.name || booking.customerName || 'Walk-in'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low">
                              <Phone className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-on-surface-variant">Phone</p>
                                <p className="text-xs font-semibold text-on-surface truncate">{booking.user?.phone || booking.customerPhone || 'N/A'}</p>
                              </div>
                            </div>
                            {booking.user?.gender && (
                              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low">
                                <CircleDot className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-on-surface-variant">Gender</p>
                                  <p className="text-xs font-semibold text-on-surface capitalize">{booking.user.gender.toLowerCase()}</p>
                                </div>
                              </div>
                            )}
                            {booking.user?.trustScore != null && (
                              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low">
                                <Star className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-on-surface-variant">Trust Score</p>
                                  <p className={cn(
                                    "text-xs font-bold",
                                    booking.user.trustScore < 40 ? "text-error" : booking.user.trustScore < 70 ? "text-amber-600" : "text-emerald-600"
                                  )}>{booking.user.trustScore.toFixed(0)}%</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Timeline */}
                        <div className="px-4 pb-3">
                          <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Booking Timeline</h4>
                          <div className="flex items-center gap-1 overflow-x-auto pb-1">
                            {[
                              { key: 'PENDING', label: 'Booked', icon: Clock },
                              { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
                              { key: 'IN_PROGRESS', label: 'In Progress', icon: CircleDot },
                              { key: 'COMPLETED', label: 'Done', icon: CheckCircle2 },
                            ].map((step, idx, arr) => {
                              const statusOrder = ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
                              const currentIdx = statusOrder.indexOf(booking.status);
                              const stepIdx = statusOrder.indexOf(step.key);
                              const isActive = stepIdx <= currentIdx && !isCancelled;
                              const Icon = step.icon;
                              return (
                                <React.Fragment key={step.key}>
                                  <div className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0",
                                    isActive ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant/50"
                                  )}>
                                    <Icon className="w-3 h-3" />
                                    {step.label}
                                  </div>
                                  {idx < arr.length - 1 && (
                                    <div className={cn("w-4 h-px shrink-0", isActive ? "bg-primary/40" : "bg-outline-variant/20")} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                            {isCancelled && (
                              <>
                                <div className="w-4 h-px bg-error/30 shrink-0" />
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-error/10 text-error text-[10px] font-bold shrink-0">
                                  {booking.status === 'NO_SHOW' ? <Ban className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {booking.status === 'NO_SHOW' ? 'No Show' : booking.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Services & Pricing */}
                        <div className="px-4 pb-3">
                          <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Services</h4>
                          <div className="space-y-1.5">
                            {booking.services?.map((s: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                                <span className="text-xs font-medium text-on-surface">{s.serviceName}</span>
                                <span className="text-xs font-bold text-on-surface">₹{s.price || '—'}</span>
                              </div>
                            ))}
                            {booking.totalAmount != null && (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
                                <span className="text-xs font-bold text-primary">Total</span>
                                <span className="text-xs font-black text-primary">₹{booking.totalAmount}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Staff & Notes */}
                        <div className="px-4 pb-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-on-surface-variant font-medium">Staff:</span>
                            <span className="font-semibold text-on-surface">{booking.staff?.name || 'Any available'}</span>
                          </div>
                          {booking.notes && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700 dark:text-amber-300">{booking.notes}</p>
                            </div>
                          )}
                          {booking.adminNotes && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-container-low">
                              <MessageSquare className="w-3.5 h-3.5 text-on-surface-variant shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold text-on-surface-variant mb-0.5">Admin Note</p>
                                <p className="text-xs text-on-surface">{booking.adminNotes}</p>
                              </div>
                            </div>
                          )}
                          {booking.cancellationReason && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-error/5 border border-error/10">
                              <XCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold text-error mb-0.5">Cancellation Reason</p>
                                <p className="text-xs text-error/80">{booking.cancellationReason}</p>
                              </div>
                            </div>
                          )}
                          {booking.bookingNumber && (
                            <div className="text-[10px] text-on-surface-variant">
                              Booking #{booking.bookingNumber}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-outline-variant/10 bg-surface-container-low/30">
                          {renderMobileActions(booking, updateStatus, addToast, playSound)}
                        </div>
                      </div>
                    )}

                    {/* Collapsed inline actions – only show primary action */}
                    {!isExpanded && (
                      <div className="px-4 pb-3">
                        <div className="flex gap-2">
                          {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL') && (
                            <Button
                              size="sm"
                              className="flex-1 text-xs py-1.5"
                              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ bookingId: booking.id, status: 'CONFIRMED', adminNotes: 'APPROVED_BY_STAFF' }); addToast({ title: 'Approved', type: 'success' }); }}
                            >
                              Approve
                            </Button>
                          )}
                          {booking.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              className="flex-1 text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700"
                              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ bookingId: booking.id, status: 'IN_PROGRESS' }); }}
                            >
                              ▶ Start
                            </Button>
                          )}
                          {booking.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              className="flex-1 text-xs py-1.5"
                              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ bookingId: booking.id, status: 'COMPLETED' }); }}
                            >
                              ✓ Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
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

/** Shared action buttons renderer – desktop (inline row) */
function renderActions(booking: any, updateStatus: any, addToast: any, playSound?: () => void) {
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
              playSound?.();
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
            playSound?.();
          }}
        >
          Approve
        </Button>
      )}
      {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL') && (
        <Button
          size="sm"
          variant="outline"
          className="text-amber-600 border-amber-600/30 text-xs"
          onClick={() => {
            const time = window.prompt('Enter proposed start time (HH:MM, 24-hour):', '10:00');
            if (time && time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
              updateStatus.mutate({ 
                bookingId: booking.id, 
                status: 'PENDING_APPROVAL',
                proposedStartTime: time,
                adminNotes: 'PROPOSED_NEW_TIME'
              });
              addToast({ title: 'Reschedule proposed', type: 'success' });
              playSound?.();
            } else if (time) {
              addToast({ title: 'Invalid time format', message: 'Please use HH:MM format', type: 'error' });
            }
          }}
        >
          Reschedule
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

/** Mobile-optimized action buttons – stacked with prominent primary action */
function renderMobileActions(booking: any, updateStatus: any, addToast: any, playSound?: () => void) {
  const isPending = booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL';
  return (
    <div className="w-full space-y-2">
      {/* Primary actions – always full width and prominent */}
      {isPending && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 text-xs py-2"
            onClick={() => {
              updateStatus.mutate({ bookingId: booking.id, status: 'CONFIRMED', adminNotes: 'APPROVED_BY_STAFF' });
              addToast({ title: 'Booking approved', type: 'success' });
              playSound?.();
            }}
          >
            ✓ Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs py-2"
            onClick={() => updateStatus.mutate({ bookingId: booking.id, status: 'CONFIRMED' })}
          >
            Confirm
          </Button>
        </div>
      )}
      {booking.status === 'CONFIRMED' && (
        <Button
          size="sm"
          className="w-full text-xs py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => updateStatus.mutate({ bookingId: booking.id, status: 'IN_PROGRESS' })}
        >
          ▶ Start Service
        </Button>
      )}
      {booking.status === 'IN_PROGRESS' && (
        <Button
          size="sm"
          className="w-full text-xs py-2.5 bg-primary hover:bg-primary/90 text-white"
          onClick={() => updateStatus.mutate({ bookingId: booking.id, status: 'COMPLETED' })}
        >
          ✓ Complete Service
        </Button>
      )}

      {/* Secondary actions – compact row */}
      <div className="flex flex-wrap gap-1.5">
        {isPending && (
          <>
            <button
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              onClick={() => {
                const time = window.prompt('Enter proposed start time (HH:MM, 24-hour):', '10:00');
                if (time && time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
                  updateStatus.mutate({
                    bookingId: booking.id,
                    status: 'PENDING_APPROVAL',
                    proposedStartTime: time,
                    adminNotes: 'PROPOSED_NEW_TIME',
                  });
                  addToast({ title: 'Reschedule proposed', type: 'success' });
                  playSound?.();
                } else if (time) {
                  addToast({ title: 'Invalid time format', message: 'Please use HH:MM format', type: 'error' });
                }
              }}
            >
              Reschedule
            </button>
            <button
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-error/10 text-error hover:bg-error/20 transition-colors"
              onClick={() => {
                const reason = window.prompt('Reason for disapproval:', 'DISAPPROVED_BY_STAFF') || 'DISAPPROVED_BY_STAFF';
                updateStatus.mutate({ bookingId: booking.id, status: 'REJECTED', adminNotes: reason });
                addToast({ title: 'Booking disapproved', type: 'warning' });
              }}
            >
              Disapprove
            </button>
          </>
        )}
        {booking.status === 'CONFIRMED' && (
          <button
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-error/10 text-error hover:bg-error/20 transition-colors"
            onClick={() => {
              if (window.confirm('Mark customer as No-Show?')) {
                updateStatus.mutate({ bookingId: booking.id, status: 'NO_SHOW' });
                addToast({ title: 'Marked as No-Show', type: 'warning' });
              }
            }}
          >
            No-Show
          </button>
        )}
        {(booking.status === 'PENDING' || booking.status === 'PENDING_APPROVAL' || booking.status === 'CONFIRMED') && (
          <button
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-error/5 text-error/80 hover:bg-error/15 transition-colors"
            onClick={() => {
              if (window.confirm('Cancel this appointment?')) {
                updateStatus.mutate({ bookingId: booking.id, status: 'CANCELLED' });
                addToast({ title: 'Appointment cancelled', type: 'info' });
                playSound?.();
              }
            }}
          >
            Cancel
          </button>
        )}
        {(booking.user?.phone || booking.customerPhone) && (
          <a
            href={`tel:${booking.user?.phone || booking.customerPhone}`}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors border border-outline-variant/10"
          >
            📞 Call
          </a>
        )}
      </div>
    </div>
  );
}
