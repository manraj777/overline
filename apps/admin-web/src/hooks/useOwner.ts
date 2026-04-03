import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export function useOwnerFinancials(params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: string;
}) {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'financials', shopId, params],
    queryFn: async () => {
      const { data } = await api.get(`/admin/owners/shops/${shopId}/financials`, { params });
      return data;
    },
    enabled: !!shopId,
    staleTime: 1000 * 30,
  });
}

export function useOwnerPayoutSettings() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'payout-settings', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/shops/${shopId}/payout-details`);
      return data;
    },
    enabled: !!shopId,
  });
}

export function useUpdateOwnerPayoutSettings() {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch(`/admin/owners/shops/${shopId}/payout-settings`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'payout-settings', shopId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'financials', shopId] });
    },
  });
}

export function useOwnerStaffHierarchy() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'staff-hierarchy', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/owners/shops/${shopId}/staff-hierarchy`);
      return data;
    },
    enabled: !!shopId,
    staleTime: 1000 * 30,
  });
}

export function useCreateOwnerStaffHierarchy() {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post(`/admin/owners/shops/${shopId}/staff-hierarchy`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'staff-hierarchy', shopId] });
    },
  });
}

export function useOwnerStaffEarnings(staffId: string, params?: { startDate?: string; endDate?: string; breakdown?: string }) {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'staff-earnings', shopId, staffId, params],
    queryFn: async () => {
      const { data } = await api.get(`/admin/owners/shops/${shopId}/staff/${staffId}/earnings`, {
        params,
      });
      return data;
    },
    enabled: !!shopId && !!staffId,
  });
}

export function useSetOwnerStaffCommission(staffId: string) {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch(
        `/admin/owners/shops/${shopId}/staff/${staffId}/commission`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'staff-earnings', shopId, staffId] });
    },
  });
}
