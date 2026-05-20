import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Booking, PaginatedResponse, Staff, UserRole } from '@/types';

let activeShopIdPromise: Promise<string> | null = null;

async function resolveActiveShopId(): Promise<string> {
  const state = useAuthStore.getState();
  if (state.shopId) {
    return state.shopId;
  }

  if (activeShopIdPromise) {
    return activeShopIdPromise;
  }

  activeShopIdPromise = (async () => {
    let firstShopId: string | undefined;
    try {
      const { data: shops } = await api.get<Array<{ id: string }>>('/admin/my-shops');
      firstShopId = shops?.[0]?.id;
    } catch {
      // Fallback handled below
    }

    if (!firstShopId) {
      try {
        const { data: myShop } = await api.get<{ id: string }>('/admin/owner/my-shop');
        firstShopId = myShop?.id;
      } catch {
        // Throw below
      }
    }

    if (!firstShopId) {
      throw new Error('No shop found for this account');
    }

    state.setShopId(firstShopId);
    return firstShopId;
  })();

  try {
    return await activeShopIdPromise;
  } finally {
    activeShopIdPromise = null;
  }
}

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
  adminNotes?: string;
  proposedStartTime?: string;
  proposedEndTime?: string;
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
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'dashboard', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/shops/${activeShopId}/dashboard`);
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: 1000 * 60, // Refresh every 60 seconds
    refetchIntervalInBackground: false,
  });
}

export function useQueueTracking() {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery<QueueTrackingBooking[]>({
    queryKey: ['admin', 'queue-tracking', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/queue/tracking/${activeShopId}`);
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: 1000 * 45,
    refetchIntervalInBackground: false,
  });
}

export function useQueueCallNext() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<QueueTrackingBooking, Error>({
    mutationFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.post(`/queue/${activeShopId}/call-next`);
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
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['admin', 'bookings', shopId, params],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/shops/${activeShopId}/bookings`, {
        params,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation<Booking, Error, UpdateBookingStatusPayload>({
    mutationFn: async ({ bookingId, status, adminNotes, proposedStartTime, proposedEndTime }) => {
      const { data } = await api.patch(`/admin/bookings/${bookingId}/status`, {
        status,
        adminNotes,
        proposedStartTime,
        proposedEndTime,
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
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.post(`/admin/shops/${activeShopId}/walk-in`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export interface QueueProposeTimePayload {
  bookingId: string;
  proposedStartTime: string;
  adminNotes?: string;
}

export function useQueueProposeTime() {
  const queryClient = useQueryClient();
  const { shopId, user } = useAuthStore();

  return useMutation<Booking, Error, QueueProposeTimePayload>({
    mutationFn: async (payload) => {
      if (user?.role === 'OWNER') {
        const activeShopId = shopId || (await resolveActiveShopId());
        const { data } = await api.post(
          `/owner/shops/${activeShopId}/queue/${payload.bookingId}/propose-time`,
          {
            shopId: activeShopId,
            bookingId: payload.bookingId,
            proposedStartTime: payload.proposedStartTime,
            adminNotes: payload.adminNotes,
          }
        );
        return data;
      } else {
        const activeShopId = shopId || (await resolveActiveShopId());
        const { data } = await api.post(`/staff/me/queue/propose-time`, {
          shopId: activeShopId,
          bookingId: payload.bookingId,
          proposedStartTime: payload.proposedStartTime,
          adminNotes: payload.adminNotes,
        });
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-tracking'] });
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
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery<Staff[]>({
    queryKey: ['admin', 'staff', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/shops/${activeShopId}/staff`);
      return data;
    },
    enabled: isAuthenticated,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<Staff, Error, { name: string; email?: string; phone?: string; age?: number; password?: string; role?: string; avatarUrl?: string }>({
    mutationFn: async (payload: { name: string; email?: string; phone?: string; age?: number; password?: string; role?: string; avatarUrl?: string }) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.post(`/admin/shops/${activeShopId}/staff`, payload);
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
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.patch(`/admin/shops/${activeShopId}/staff/${staffId}`, payload);
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
      const activeShopId = shopId || (await resolveActiveShopId());
      await api.delete(`/admin/shops/${activeShopId}/staff/${staffId}`);
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
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.post(`/admin/shops/${activeShopId}/staff/${staffId}/services/${serviceId}`);
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
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.delete(`/admin/shops/${activeShopId}/staff/${staffId}/services/${serviceId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useShopSettings() {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'settings', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/shops/${activeShopId}/settings`);
      return data;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      await api.patch(`/admin/shops/${activeShopId}/settings`, payload);
      const { data } = await api.get(`/admin/shops/${activeShopId}/settings`);
      return data;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(['admin', 'settings', data.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
}

export function useWorkingHours() {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'working-hours', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/shops/${activeShopId}/working-hours`);
      return data;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ dayOfWeek, ...payload }: { dayOfWeek: string; openTime?: string; closeTime?: string; isClosed?: boolean }) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.patch(`/admin/shops/${activeShopId}/working-hours/${dayOfWeek}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'working-hours'] });
    },
  });
}
