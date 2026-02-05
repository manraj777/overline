import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

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
      const { data } = await api.get('/analytics', {
        params: { shopId, ...params },
      });
      return data;
    },
    enabled: !!shopId,
  });
}

export function useDailyMetrics(date?: string) {
  const { shopId } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'analytics', 'daily', shopId, date],
    queryFn: async () => {
      const { data } = await api.get('/analytics/daily', {
        params: { shopId, date },
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
      const { data } = await api.get('/analytics/popular-services', {
        params: { shopId },
      });
      return data;
    },
    enabled: !!shopId,
  });
}
