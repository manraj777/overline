import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Shop, ShopWithDetails, QueueStats, PaginatedResponse, ShopSlotStatus } from '@/types';

interface SearchParams {
  query?: string;
  city?: string;
  type?: 'SALON' | 'CLINIC';
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export function useShops(params: SearchParams = {}) {
  return useQuery<PaginatedResponse<Shop>>({
    queryKey: ['shops', params],
    queryFn: async () => {
      // Only send non-empty params
      const queryParams: Record<string, string | number> = {};
      if (params.query) queryParams.query = params.query;
      if (params.city) queryParams.city = params.city;
      if (params.type) queryParams.type = params.type;
      if (params.latitude) queryParams.latitude = params.latitude;
      if (params.longitude) queryParams.longitude = params.longitude;
      if (params.radiusKm) queryParams.radiusKm = params.radiusKm;
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;

      const { data } = await api.get('/shops', { params: queryParams });
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
        params: { latitude: lat, longitude: lng, radiusKm: radius },
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
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

export function useShopServicesWithSlots(shopId: string, date: string) {
  return useQuery<any[]>({
    queryKey: ['shops', shopId, 'services', date],
    queryFn: async () => {
      const { data } = await api.get(`/shops/${shopId}/services`, {
        params: { date },
      });
      return data;
    },
    enabled: !!shopId && !!date,
    staleTime: 1000 * 60,
  });
}

export function useShopServiceSlots(shopId: string, serviceId: string, date: string) {
  return useQuery<ShopSlotStatus[]>({
    queryKey: ['shops', shopId, 'slots', serviceId, date],
    queryFn: async () => {
      const { data } = await api.get(`/shops/${shopId}/slots`, {
        params: { serviceId, date },
      });
      return data;
    },
    enabled: !!shopId && !!serviceId && !!date,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

export function useTrendingShops(limit: number = 5) {
  return useQuery<Shop[]>({
    queryKey: ['shops', 'trending', limit],
    queryFn: async () => {
      const { data } = await api.get('/shops/trending', {
        params: { limit },
      });
      return data;
    },
    staleTime: 1000 * 60 * 30, // cache for 30 minutes
  });
}
