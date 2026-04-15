import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useBookingStore } from '@/stores/booking';
import type { Booking, TimeSlot, PaginatedResponse } from '@/types';

interface CreateBookingPayload {
  shopId: string;
  serviceIds: string[];
  staffId?: string;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
  offerCode?: string;
}

interface GetSlotsParams {
  shopId: string;
  date: string;
  staffId?: string;
  serviceIds: string[];
}

const toIsoStartTime = (scheduledDate: string, scheduledTime: string) => {
  if (scheduledTime.includes('T')) {
    const parsed = new Date(scheduledTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const normalizedTime = scheduledTime.length === 5 ? `${scheduledTime}:00` : scheduledTime;
  const parsed = new Date(`${scheduledDate}T${normalizedTime}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return `${scheduledDate}T${normalizedTime}`;
};

export function useAvailableSlots(params: GetSlotsParams) {
  return useQuery<TimeSlot[]>({
    queryKey: ['slots', params],
    queryFn: async () => {
      const { shopId, serviceIds, ...rest } = params;
      const { data } = await api.get(`/queue/slots/${shopId}`, {
        params: { ...rest, serviceIds: serviceIds.join(',') },
      });

      const slots: TimeSlot[] = Array.isArray(data) ? data : [];
      const today = new Date().toISOString().slice(0, 10);

      const isThirtyMinuteFrame = (slot: TimeSlot) => {
        if (slot.startTime.includes('T')) {
          const parsed = new Date(slot.startTime);
          return !Number.isNaN(parsed.getTime()) && parsed.getMinutes() % 30 === 0;
        }

        const normalizedTime = slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime;
        const parsed = new Date(`${params.date}T${normalizedTime}`);
        return !Number.isNaN(parsed.getTime()) && parsed.getMinutes() % 30 === 0;
      };

      const framedSlots = slots.filter(isThirtyMinuteFrame);

      if (params.date !== today) {
        return framedSlots;
      }

      const nowMs = Date.now();
      const toDateMs = (slot: TimeSlot) => {
        if (slot.startTime.includes('T')) {
          return new Date(slot.startTime).getTime();
        }
        const normalizedTime = slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime;
        return new Date(`${params.date}T${normalizedTime}`).getTime();
      };

      // Only show present/future slots on the current date.
      return framedSlots.filter((slot) => Number.isFinite(toDateMs(slot)) && toDateMs(slot) >= nowMs);
    },
    enabled: !!params.shopId && !!params.date && params.serviceIds.length > 0,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Auto-refresh every minute
  });
}

export function useMyBookings(status?: string) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['bookings', 'my', status],
    queryFn: async () => {
      const { data } = await api.get('/bookings/my', {
        params: { status },
      });
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useBooking(id: string) {
  return useQuery<Booking>({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { reset } = useBookingStore();

  return useMutation<Booking, Error, CreateBookingPayload>({
    mutationFn: async ({ scheduledDate, scheduledTime, ...rest }) => {
      // Normalize start time into an ISO datetime payload accepted by backend validators.
      const startTime = toIsoStartTime(scheduledDate, scheduledTime);
      const { data } = await api.post('/bookings', { ...rest, startTime });
      return data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.setQueryData(['bookings', booking.id], booking);
      reset();
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await api.patch(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.setQueryData(['bookings', booking.id], booking);
    },
  });
}

export function usePendingReviewBooking() {
  return useQuery<Booking | null>({
    queryKey: ['bookings', 'pending-review'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/pending-review');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation<
    Booking,
    Error,
    { bookingId: string; scheduledDate: string; scheduledTime: string }
  >({
    mutationFn: async ({ bookingId, scheduledDate, scheduledTime }) => {
      // Normalize start time into an ISO datetime payload accepted by backend validators.
      const newStartTime = toIsoStartTime(scheduledDate, scheduledTime);
      const { data } = await api.patch(`/bookings/${bookingId}/reschedule`, {
        newStartTime,
      });
      return data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.setQueryData(['bookings', booking.id], booking);
    },
  });
}
