import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Booking, PaginatedResponse } from '@overline/shared';

interface GetBookingsParams {
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}

interface UpdateBookingStatusPayload {
  bookingId: string;
  status: string;
}

interface CreateWalkInPayload {
  shopId: string;
  serviceIds: string[];
  staffId?: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
}

export function useDashboard() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'dashboard', shopId],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard', {
        params: { shopId },
      });
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });
}

export function useAdminBookings(params: GetBookingsParams = {}) {
  const { shopId } = useAuthStore();

  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['admin', 'bookings', shopId, params],
    queryFn: async () => {
      const { data } = await api.get('/admin/bookings', {
        params: { shopId, ...params },
      });
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 1000 * 15, // Refresh every 15 seconds
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, UpdateBookingStatusPayload>({
    mutationFn: async ({ bookingId, status }) => {
      const { data } = await api.patch(`/admin/bookings/${bookingId}/status`, {
        status,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useCreateWalkIn() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, CreateWalkInPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/admin/walk-in', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useMarkComplete() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await api.patch(`/admin/bookings/${bookingId}/status`, {
        status: 'COMPLETED',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useStartService() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await api.patch(`/admin/bookings/${bookingId}/status`, {
        status: 'IN_PROGRESS',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await api.patch(`/admin/bookings/${bookingId}/status`, {
        status: 'NO_SHOW',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}
