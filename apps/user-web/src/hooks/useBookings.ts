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
}

interface GetSlotsParams {
  shopId: string;
  date: string;
  staffId?: string;
  serviceIds: string[];
}

export function useAvailableSlots(params: GetSlotsParams) {
  return useQuery<TimeSlot[]>({
    queryKey: ['slots', params],
    queryFn: async () => {
      const { data } = await api.get('/queue/slots', { params });
      return data;
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
    mutationFn: async (payload) => {
      const { data } = await api.post('/bookings', payload);
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
      const { data } = await api.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.setQueryData(['bookings', booking.id], booking);
    },
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
      const { data } = await api.post(`/bookings/${bookingId}/reschedule`, {
        scheduledDate,
        scheduledTime,
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
