import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

async function resolveActiveShopId(): Promise<string> {
  const state = useAuthStore.getState();
  if (state.shopId) {
    return state.shopId;
  }

  const { data: shops } = await api.get<Array<{ id: string }>>('/admin/my-shops');
  const firstShopId = shops?.[0]?.id;
  if (!firstShopId) {
    throw new Error('No shop found for this account');
  }

  state.setShopId(firstShopId);
  return firstShopId;
}

export function useOwnerFinancials(params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: string;
}) {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'financials', shopId, params],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/owners/shops/${activeShopId}/financials`, { params });
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}

export function useOwnerPayoutSettings() {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'payout-settings', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/shops/${activeShopId}/payout-details`);
      return data;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateOwnerPayoutSettings() {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.patch(`/admin/owners/shops/${activeShopId}/payout-settings`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'payout-settings', shopId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'financials', shopId] });
    },
  });
}

export function useOwnerStaffHierarchy() {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'staff-hierarchy', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/owners/shops/${activeShopId}/staff-hierarchy`);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}

export function useCreateOwnerStaffHierarchy() {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.post(`/admin/owners/shops/${activeShopId}/staff-hierarchy`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'staff-hierarchy', shopId] });
    },
  });
}

export function useOwnerStaffEarnings(staffId: string, params?: { startDate?: string; endDate?: string; breakdown?: string }) {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['owner', 'staff-earnings', shopId, staffId, params],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/admin/owners/shops/${activeShopId}/staff/${staffId}/earnings`, {
        params,
      });
      return data;
    },
    enabled: isAuthenticated && !!staffId,
  });
}

export function useSetOwnerStaffCommission(staffId: string) {
  const { shopId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.patch(
        `/admin/owners/shops/${activeShopId}/staff/${staffId}/commission`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'staff-earnings', shopId, staffId] });
    },
  });
}
