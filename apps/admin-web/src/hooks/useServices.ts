import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Service } from '@/types';

interface CreateServicePayload {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category?: string;
}

interface UpdateServicePayload extends Partial<CreateServicePayload> {
  id: string;
  isActive?: boolean;
}

export function useServices() {
  const { shopId } = useAuthStore();

  return useQuery<Service[]>({
    queryKey: ['admin', 'services', shopId],
    queryFn: async () => {
      const { data } = await api.get('/services', {
        params: { shopId },
      });
      return data;
    },
    enabled: !!shopId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { shopId } = useAuthStore();

  return useMutation<Service, Error, CreateServicePayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/services', { ...payload, shopId });
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
