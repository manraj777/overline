import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type {
  Booking,
  BookingStatus,
  PaginatedResponse,
  StaffEarningsResponse,
  StaffProfile,
  StaffScheduleResponse,
} from '@/types';

interface StaffBookingParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

interface CreateStaffOwnServicePayload {
  shopId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  durationMinutes: number;
  maxClientsPerHour?: number;
  category?: string;
}

interface UpdateStaffOwnServicePayload {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  durationMinutes?: number;
  maxClientsPerHour?: number;
  category?: string;
  isActive?: boolean;
}

let supportsStaffSelfServiceEndpoints: boolean | null = null;
let supportsStaffEarningsEndpoint: boolean | null = null;

function resolveStaffShopId(): string {
  const state = useAuthStore.getState();
  const fallbackShopId = state.shopId || state.user?.shopId || state.user?.shopIds?.[0];
  if (!fallbackShopId) {
    throw new Error('No staff shop found for this account');
  }
  return fallbackShopId;
}

function mapToGenericCreatePayload(payload: CreateStaffOwnServicePayload) {
  return {
    name: payload.name,
    description: payload.description,
    imageUrl: payload.imageUrl,
    durationMinutes: payload.durationMinutes,
    price: payload.price,
    category: payload.category,
  };
}

function mapToGenericUpdatePayload(payload: Omit<UpdateStaffOwnServicePayload, 'id'>) {
  return {
    name: payload.name,
    description: payload.description,
    imageUrl: payload.imageUrl,
    durationMinutes: payload.durationMinutes,
    price: payload.price,
    category: payload.category,
    isActive: payload.isActive,
  };
}

export function useStaffMe() {
  return useQuery<StaffProfile>({
    queryKey: ['staff', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/admin/staff/me');
      return data;
    },
  });
}

export function useUpdateStaffMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch('/admin/staff/me', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'me'] });
    },
  });
}

export function useUpdateStaffBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch('/admin/staff/me/bank-details', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'payout-history'] });
    },
  });
}

export function useStaffOwnSchedule() {
  return useQuery<StaffScheduleResponse>({
    queryKey: ['staff', 'schedule'],
    queryFn: async () => {
      const { data } = await api.get('/admin/staff/me/schedule');
      return data;
    },
  });
}

export function useUpdateStaffOwnSchedule(dayOfWeek: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch(`/admin/staff/me/schedule/${dayOfWeek}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
    },
  });
}

export function useRequestStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/admin/staff/me/time-off', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
    },
  });
}

export function useUpdateStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timeOffId, ...payload }: { timeOffId: string } & Record<string, unknown>) => {
      const { data } = await api.patch(`/admin/staff/me/time-off/${timeOffId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
    },
  });
}

export function useDeleteStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeOffId: string) => {
      const { data } = await api.delete(`/admin/staff/me/time-off/${timeOffId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'schedule'] });
    },
  });
}

export function useStaffOwnBookings(params?: StaffBookingParams) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ['staff', 'bookings', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/staff/me/bookings', { params });
      return data;
    },
    refetchInterval: 1000 * 30,
  });
}

export function useUpdateStaffOwnBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, ...payload }: { bookingId: string; status: BookingStatus; notes?: string; proposedStartTime?: string; proposedEndTime?: string }) => {
      const { data } = await api.patch(`/admin/staff/me/bookings/${bookingId}/status`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'earnings'] });
    },
  });
}

export function useStaffAssignedServices() {
  return useQuery({
    queryKey: ['staff', 'services'],
    queryFn: async () => {
      if (supportsStaffSelfServiceEndpoints !== false) {
        try {
          const { data } = await api.get('/admin/staff/me/services');
          supportsStaffSelfServiceEndpoints = true;
          return data;
        } catch (error) {
          const status = (error as AxiosError)?.response?.status;
          if (status !== 404) {
            throw error;
          }
          supportsStaffSelfServiceEndpoints = false;
        }
      }

      const shopId = resolveStaffShopId();
      const { data } = await api.get(`/services/shop/${shopId}`);
      return {
        legacyServices: Array.isArray(data) ? data : [],
        profileServices: [],
      };
    },
    retry: false,
  });
}

export function useCreateStaffOwnService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateStaffOwnServicePayload) => {
      if (supportsStaffSelfServiceEndpoints !== false) {
        try {
          const { data } = await api.post('/admin/staff/me/services', payload);
          supportsStaffSelfServiceEndpoints = true;
          return data;
        } catch (error) {
          const status = (error as AxiosError)?.response?.status;
          if (status !== 404) {
            throw error;
          }
          supportsStaffSelfServiceEndpoints = false;
        }
      }

      const { data } = await api.post(
        `/services/shop/${payload.shopId}`,
        mapToGenericCreatePayload(payload),
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
}

export function useUpdateStaffOwnService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateStaffOwnServicePayload) => {
      if (supportsStaffSelfServiceEndpoints !== false) {
        try {
          const { data } = await api.patch(`/admin/staff/me/services/${id}`, payload);
          supportsStaffSelfServiceEndpoints = true;
          return data;
        } catch (error) {
          const status = (error as AxiosError)?.response?.status;
          if (status !== 404) {
            throw error;
          }
          supportsStaffSelfServiceEndpoints = false;
        }
      }

      const { data } = await api.patch(`/services/${id}`, mapToGenericUpdatePayload(payload));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
}

export function useDeleteStaffOwnService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (supportsStaffSelfServiceEndpoints !== false) {
        try {
          // Staff controller currently exposes update only; soft-delete by setting isActive false.
          const { data } = await api.patch(`/admin/staff/me/services/${id}`, { isActive: false });
          supportsStaffSelfServiceEndpoints = true;
          return data;
        } catch (error) {
          const status = (error as AxiosError)?.response?.status;
          if (status !== 404) {
            throw error;
          }
          supportsStaffSelfServiceEndpoints = false;
        }
      }

      const { data } = await api.patch(`/services/${id}`, { isActive: false });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
}

export function useStaffOwnEarnings(params?: { startDate?: string; endDate?: string; breakdown?: string }) {
  return useQuery<StaffEarningsResponse>({
    queryKey: ['staff', 'earnings', params],
    queryFn: async () => {
      if (supportsStaffEarningsEndpoint === false) {
        return {
          totalEarnings: 0,
          commissionRate: 0,
          breakdownType: params?.breakdown || 'daily',
          breakdown: [],
          pendingPayment: 0,
          lastPayout: null,
        };
      }

      try {
        const { data } = await api.get('/admin/staff/me/earnings', { params });
        supportsStaffEarningsEndpoint = true;
        return data;
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status === 404) {
          supportsStaffEarningsEndpoint = false;
          return {
            totalEarnings: 0,
            commissionRate: 0,
            breakdownType: params?.breakdown || 'daily',
            breakdown: [],
            pendingPayment: 0,
            lastPayout: null,
          };
        }
        throw error;
      }
    },
    retry: false,
  });
}

export function useStaffPayoutHistory(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['staff', 'payout-history', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/staff/me/payout-history', { params });
      return data;
    },
  });
}

export function useStaffShopReviews(params?: {
  page?: number;
  limit?: number;
  rating?: number;
  withComment?: boolean;
  unanswered?: boolean;
}) {
  return useQuery({
    queryKey: ['staff', 'reviews', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/staff/me/reviews', { params });
      return data;
    },
  });
}

export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const { data } = await api.post(`/reviews/${reviewId}/reply`, { reply });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'reviews'] });
    },
  });
}
