import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { format, subDays } from 'date-fns';

interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month';
}

export function useAnalytics(params: AnalyticsParams = {}) {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'analytics', shopId, params],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/shops/${shopId}/summary`, {
        params,
      });
      return data;
    },
    enabled: !!shopId,
  });
}

export function useDailyMetrics(params: { startDate?: string; endDate?: string } = {}) {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'analytics', 'daily', shopId, params],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/shops/${shopId}/daily`, {
        params,
      });
      return data;
    },
    enabled: !!shopId,
  });
}

export function usePopularServices() {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'analytics', 'popular-services', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/shops/${shopId}/services`);
      return data;
    },
    enabled: !!shopId,
  });
}

export function useRevenueChart(days = 30) {
  const { shopId } = useAuthStore();
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['admin', 'analytics', 'revenue-chart', shopId, days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/shops/${shopId}/daily`, {
        params: { startDate, endDate },
      });
      return data;
    },
    enabled: !!shopId,
    refetchInterval: 60_000, // refetch every minute
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['admin', 'recent-activity'],
    queryFn: async () => {
      const { data } = await api.get('/notifications', {
        params: { limit: 5 },
      });
      return data?.data || [];
    },
    refetchInterval: 30_000,
  });
}

