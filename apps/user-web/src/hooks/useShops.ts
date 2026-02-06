import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Shop, ShopWithDetails, QueueStats, PaginatedResponse } from '@/types';

interface SearchParams {
  query?: string;
  type?: 'SALON' | 'CLINIC';
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export function useShops(params: SearchParams = {}) {
  return useQuery<PaginatedResponse<Shop>>({
    queryKey: ['shops', params],
    queryFn: async () => {
      const { data } = await api.get('/shops', { params });
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useNearbyShops(lat: number, lng: number, radius = 10) {
  return useQuery<Shop[]>({
    queryKey: ['shops', 'nearby', lat, lng, radius],
    queryFn: async () => {
      const { data } = await api.get('/shops/nearby', {
        params: { lat, lng, radius },
      });
      return data;
    },
    enabled: !!lat && !!lng,
    staleTime: 1000 * 60 * 5,
  });
}

export function useShop(slug: string) {
  return useQuery<ShopWithDetails>({
    queryKey: ['shops', slug],
    queryFn: async () => {
      const { data } = await api.get(`/shops/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 2,
  });
}

export function useShopQueueStats(shopId: string) {
  return useQuery<QueueStats>({
    queryKey: ['shops', shopId, 'queue'],
    queryFn: async () => {
      const { data } = await api.get(`/shops/${shopId}/queue`);
      return data;
    },
    enabled: !!shopId,
    staleTime: 1000 * 30, // 30 seconds for real-time-ish updates
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
  });
}
