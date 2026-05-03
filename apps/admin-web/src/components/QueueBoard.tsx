'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useQueueTracking,
  useQueueCallNext,
  useQueueCheckIn,
  useQueueStartService,
  useQueueMarkDone,
  useQueueRemove,
  useQueueSocket,
  useUpdateBookingStatus,
} from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { ConfirmModal, useToast } from '@/components/ui';

export type AdminQueueStatus =
  | 'waiting'
  | 'approaching'
  | 'in_progress'
  | 'done'
  | 'cancelled'
  | 'no_show'
  | 'pending'
  | 'pending_approval';

export interface AdminQueueItem {
  id: string;
  position: number;
  customerName: string;
  phone: string;
  service: string;
  tokenCode: string;
  joinedAt: string;
  estimatedStart: string;
  status: AdminQueueStatus;
}

const STATUS_LABELS: Record<AdminQueueStatus, string> = {
  waiting: 'Waiting',
  approaching: 'Approaching',
  in_progress: 'In Service',
  done: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  pending: 'Pending',
  pending_approval: 'Pending Approval',
};

const STATUS_CHIP_STYLES: Record<AdminQueueStatus, string> = {
  waiting: 'bg-slate-400/20 text-slate-300',
  approaching: 'bg-amber-300/20 text-amber-200',
  in_progress: 'bg-sky-400/20 text-sky-200',
  done: 'bg-emerald-400/20 text-emerald-200',
  cancelled: 'bg-rose-400/20 text-rose-200',
  no_show: 'bg-fuchsia-400/20 text-fuchsia-200',
  pending: 'bg-orange-400/20 text-orange-200',
  pending_approval: 'bg-orange-500/20 text-orange-200',
};

function mapStatus(status: string): AdminQueueStatus {
  if (status === 'IN_PROGRESS') return 'in_progress';
  if (status === 'COMPLETED') return 'done';
  if (status === 'CONFIRMED') return 'approaching';
  if (status === 'NO_SHOW') return 'no_show';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'PENDING') return 'pending';
  if (status === 'PENDING_APPROVAL') return 'pending_approval';
  return 'waiting';
}

function mask(phone: string): string {
  return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function QueueBoard() {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [averageServiceMinutes, setAverageServiceMinutes] = useState(20);
  const [verificationModalBookingId, setVerificationModalBookingId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [removeModalBookingId, setRemoveModalBookingId] = useState<string | null>(null);

  const { data: queueData, isLoading } = useQueueTracking();
  const callNextMutation = useQueueCallNext();
  const checkInMutation = useQueueCheckIn();
  const startServiceMutation = useQueueStartService();
  const markDoneMutation = useQueueMarkDone();
  const removeMutation = useQueueRemove();
  const updateStatusMutation = useUpdateBookingStatus();

  useQueueSocket({
    shopId: shopId || undefined,
    enabled: !!shopId,
    onQueueUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking', shopId] });
    },
    onBookingUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking', shopId] });
    },
  });

  const queue: AdminQueueItem[] = useMemo(() => {
    if (!queueData) return [];
    return queueData.map((booking, index) => ({
      id: booking.id,
      position: booking.queuePosition ?? index + 1,
      customerName: booking.customerName || booking.user?.name || 'Walk-in User',
      phone: booking.customerPhone || booking.user?.phone || '0000000000',
      service: booking.services?.[0]?.serviceName || 'Service',
      tokenCode: booking.bookingNumber,
      joinedAt: formatTime(booking.createdAt),
      estimatedStart: formatTime(booking.startTime),
      status: mapStatus(booking.status),
    }));
  }, [queueData]);

  const waitingCount = useMemo(() => queue.filter((entry) => ['waiting', 'approaching', 'pending', 'pending_approval'].includes(entry.status)).length, [queue]);

  const callNext = async () => {
    try {
      await callNextMutation.mutateAsync();
      addToast({ type: 'success', title: 'Next customer called', message: 'Queue advanced successfully.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to call next customer.';
      addToast({ type: 'error', title: 'Call next failed', message });
    }
  };

  const checkIn = async (bookingId: string) => {
    try {
      await checkInMutation.mutateAsync(bookingId);
      addToast({ type: 'success', title: 'Checked in', message: 'Customer marked as checked in.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check in customer.';
      addToast({ type: 'error', title: 'Check-in failed', message });
    }
  };

  const openStartService = (bookingId: string) => {
    setVerificationModalBookingId(bookingId);
    setVerificationCode('');
  };

  const confirmStartService = async () => {
    if (!verificationModalBookingId) return;
    if (!verificationCode.trim()) {
      addToast({ type: 'warning', title: 'Verification code required', message: 'Enter the service token to continue.' });
      return;
    }

    try {
      await startServiceMutation.mutateAsync({
        bookingId: verificationModalBookingId,
        verificationCode: verificationCode.trim(),
      });
      addToast({ type: 'success', title: 'Service started', message: 'Token validated and service started.' });
      setVerificationModalBookingId(null);
      setVerificationCode('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start service.';
      addToast({ type: 'error', title: 'Start failed', message });
    }
  };

  const markDone = async (bookingId: string) => {
    try {
      await markDoneMutation.mutateAsync(bookingId);
      addToast({ type: 'success', title: 'Service completed', message: 'Customer marked done.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark done.';
      addToast({ type: 'error', title: 'Update failed', message });
    }
  };

  const approveBooking = async (bookingId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ bookingId, status: 'CONFIRMED' });
      addToast({ type: 'success', title: 'Booking Approved', message: 'Customer has been moved to the confirmed queue.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve booking.';
      addToast({ type: 'error', title: 'Approval failed', message });
    }
  };

  const rejectBooking = async (bookingId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ bookingId, status: 'CANCELLED' });
      addToast({ type: 'success', title: 'Booking Rejected', message: 'Customer booking was cancelled.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject booking.';
      addToast({ type: 'error', title: 'Rejection failed', message });
    }
  };

  const openRemoveModal = (id: string) => {
    setRemoveModalBookingId(id);
  };

  const removeEntry = async () => {
    if (!removeModalBookingId) return;
    try {
      await removeMutation.mutateAsync({
        bookingId: removeModalBookingId,
        reason: 'Removed by admin from queue board',
      });
      addToast({ type: 'success', title: 'Removed from queue', message: 'Queue entry removed successfully.' });
      setRemoveModalBookingId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove queue entry.';
      addToast({ type: 'error', title: 'Remove failed', message });
    }
  };

  const isMutating =
    callNextMutation.isPending ||
    checkInMutation.isPending ||
    startServiceMutation.isPending ||
    markDoneMutation.isPending ||
    removeMutation.isPending ||
    updateStatusMutation.isPending;

  return (
    <section className="rounded-3xl border border-white/10 bg-[#101725] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Queue Board</h2>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>Avg service min</span>
          <input
            type="number"
            value={averageServiceMinutes}
            min={5}
            onChange={(event) => setAverageServiceMinutes(Number(event.target.value) || 5)}
            className="w-16 rounded-lg border border-white/20 bg-[#0b111d] px-2 py-1 text-white"
          />
          <button
            type="button"
            className="rounded-full bg-[#f6bd60] px-3 py-1 text-xs font-semibold text-black"
            onClick={callNext}
            disabled={callNextMutation.isPending}
          >
            Call Next (Approaching)
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm text-white/60">Current queue length: {waitingCount}</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
              <div className="mt-4 flex gap-2">
                <div className="h-7 w-20 rounded-full bg-white/10" />
                <div className="h-7 w-24 rounded-full bg-white/10" />
                <div className="h-7 w-20 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
          Queue is empty right now. New joins will appear here in realtime.
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">
                  #{entry.position} {entry.customerName} <span className="text-white/60">({mask(entry.phone)})</span>
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {entry.service} • Token {entry.tokenCode} • Joined {entry.joinedAt} • ETA {averageServiceMinutes * entry.position}m
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CHIP_STYLES[entry.status]}`}
              >
                {STATUS_LABELS[entry.status]}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(entry.status === 'pending' || entry.status === 'pending_approval') ? (
                <>
                  <button
                    type="button"
                    className="rounded-full border border-orange-400/40 px-3 py-1 text-xs text-orange-200"
                    onClick={() => approveBooking(entry.id)}
                    disabled={isMutating}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-200"
                    onClick={() => rejectBooking(entry.id)}
                    disabled={isMutating}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white"
                    onClick={() => checkIn(entry.id)}
                    disabled={isMutating}
                  >
                    Check In
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white"
                    onClick={() => openStartService(entry.id)}
                    disabled={isMutating}
                  >
                    Verify Token & Start
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white"
                    onClick={() => markDone(entry.id)}
                    disabled={isMutating}
                  >
                    Mark Service Done
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-200"
                    onClick={() => openRemoveModal(entry.id)}
                    disabled={isMutating}
                  >
                    Remove From Queue
                  </button>
                </>
              )}
            </div>
          </article>
          ))}
        </div>
      )}

      {verificationModalBookingId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101725] p-5">
            <h3 className="text-lg font-semibold text-white">Verify Token</h3>
            <p className="mt-2 text-sm text-white/70">
              Enter the customer verification code before starting service.
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className="mt-4 h-10 w-full rounded-lg border border-white/20 bg-[#0b111d] px-3 text-white"
              placeholder="Enter 4-digit code"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white"
                onClick={() => {
                  setVerificationModalBookingId(null);
                  setVerificationCode('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-[#f6bd60] px-4 py-1.5 text-xs font-semibold text-black"
                onClick={confirmStartService}
                disabled={startServiceMutation.isPending}
              >
                {startServiceMutation.isPending ? 'Starting...' : 'Verify & Start Service'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={!!removeModalBookingId}
        title="Remove From Queue"
        description="This will cancel the active queue booking for this customer."
        confirmLabel="Remove"
        cancelLabel="Keep"
        isConfirming={removeMutation.isPending}
        onConfirm={removeEntry}
        onCancel={() => setRemoveModalBookingId(null)}
      />
    </section>
  );
}
