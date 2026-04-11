import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Service } from '@/types';

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

interface CreateServicePayload {
  name: string;
  description?: string;
  imageUrl?: string;
  durationMinutes: number;
  price: number;
  category?: string;
}

interface UpdateServicePayload extends Partial<CreateServicePayload> {
  id: string;
  isActive?: boolean;
}

export function useServices() {
  const { shopId, isAuthenticated } = useAuthStore();

  return useQuery<Service[]>({
    queryKey: ['admin', 'services', shopId],
    queryFn: async () => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.get(`/services/shop/${activeShopId}`);
      return data;
    },
    enabled: isAuthenticated,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<Service, Error, CreateServicePayload>({
    mutationFn: async (payload) => {
      const activeShopId = shopId || (await resolveActiveShopId());
      const { data } = await api.post(`/services/shop/${activeShopId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation<Service, Error, UpdateServicePayload>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/services/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
}
