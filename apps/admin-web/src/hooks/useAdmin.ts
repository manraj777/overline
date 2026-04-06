import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Booking, PaginatedResponse, Staff } from '@/types';

interface GetBookingsParams {
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface UpdateBookingStatusPayload {
  bookingId: string;
  status: string;
}

interface CreateWalkInPayload {
  serviceIds: string[];
  staffId?: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
}

interface QueueTrackingService {
  serviceName: string;
}

export interface QueueTrackingBooking {
  id: string;
  bookingNumber: string;
  status: string;
  queuePosition?: number | null;
  verificationCode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: string;
  startTime: string;
  user?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  services?: QueueTrackingService[];
}

interface QueueStartServicePayload {
  bookingId: string;
  verificationCode: string;
}

interface QueueRemovePayload {
  bookingId: string;
  reason?: string;
}

export function useDashboard() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'dashboard', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/shops/${shopId}/dashboard`);
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });
}

export function useQueueTracking() {
  const { shopId } = useAuthStore();

  return useQuery<QueueTrackingBooking[]>({
    queryKey: ['admin', 'queue-tracking', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/queue/tracking/${shopId}`);
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 1000 * 20,
  });
}

export function useQueueCallNext() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<QueueTrackingBooking, Error>({
    mutationFn: async () => {
      const { data } = await api.post(`/queue/${shopId}/call-next`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useQueueCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<QueueTrackingBooking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await api.patch(`/queue/${bookingId}/check-in`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useQueueStartService() {
  const queryClient = useQueryClient();

  return useMutation<QueueTrackingBooking, Error, QueueStartServicePayload>({
    mutationFn: async ({ bookingId, verificationCode }) => {
      const { data } = await api.post(`/queue/${bookingId}/start-service`, {
        verificationCode,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useQueueMarkDone() {
  const queryClient = useQueryClient();

  return useMutation<QueueTrackingBooking, Error, string>({
    mutationFn: async (bookingId) => {
      const { data } = await api.post(`/queue/${bookingId}/mark-done`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useQueueRemove() {
  const queryClient = useQueryClient();

  return useMutation<QueueTrackingBooking, Error, QueueRemovePayload>({
    mutationFn: async ({ bookingId, reason }) => {
      const { data } = await api.delete(`/queue/${bookingId}`, {
        data: { reason },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useAdminBookings(params: GetBookingsParams = {}) {
  const { shopId } = useAuthStore();

  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['admin', 'bookings', shopId, params],
    queryFn: async () => {
      const { data } = await api.get('/admin/bookings', {
        params: {
          ...params,
          shopId,
        },
      });
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
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
  const { shopId } = useAuthStore();

  return useMutation<Booking, Error, CreateWalkInPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/admin/shops/${shopId}/walk-in`, payload);
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

export function useStaff() {
  const { shopId } = useAuthStore();

  return useQuery<Staff[]>({
    queryKey: ['admin', 'staff', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/shops/${shopId}/staff`);
      return data;
    },
    enabled: !!shopId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<Staff, Error, { name: string; email?: string; phone?: string; age?: number; password?: string; role?: string; avatarUrl?: string }>({
    mutationFn: async (payload: { name: string; email?: string; phone?: string; age?: number; password?: string; role?: string; avatarUrl?: string }) => {
      const { data } = await api.post(`/admin/shops/${shopId}/staff`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<Staff, Error, { staffId: string; name?: string; email?: string; phone?: string; age?: number; role?: string; isActive?: boolean; avatarUrl?: string }>({
    mutationFn: async ({ staffId, ...payload }: { staffId: string; name?: string; email?: string; phone?: string; age?: number; role?: string; isActive?: boolean; avatarUrl?: string }) => {
      const { data } = await api.patch(`/admin/shops/${shopId}/staff/${staffId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<void, Error, string>({
    mutationFn: async (staffId: string) => {
      await api.delete(`/admin/shops/${shopId}/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useAssignServiceToStaff() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ staffId, serviceId }: { staffId: string; serviceId: string }) => {
      const { data } = await api.post(`/admin/shops/${shopId}/staff/${staffId}/services/${serviceId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useUnassignServiceFromStaff() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ staffId, serviceId }: { staffId: string; serviceId: string }) => {
      const { data } = await api.delete(`/admin/shops/${shopId}/staff/${staffId}/services/${serviceId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useShopSettings() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'settings', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/shops/${shopId}/settings`);
      return data;
    },
    enabled: !!shopId,
  });
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await api.patch(`/admin/shops/${shopId}/settings`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
}

export function useWorkingHours() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'working-hours', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/shops/${shopId}/working-hours`);
      return data;
    },
    enabled: !!shopId,
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ dayOfWeek, ...payload }: { dayOfWeek: string; openTime?: string; closeTime?: string; isClosed?: boolean }) => {
      const { data } = await api.patch(`/admin/shops/${shopId}/working-hours/${dayOfWeek}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'working-hours'] });
    },
  });
}
