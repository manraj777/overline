import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLocation } from './useLocation';
import { useAuthStore } from '@/stores/auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAiRecommendations(limit = 8) {
  const { location } = useLocation(false);
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['ai', 'recommendations', location?.lat, location?.lng, limit],
    queryFn: async () => {
      const { data } = await api.get('/ai/recommendations', {
        params: {
          lat: location?.lat,
          lng: location?.lng,
          limit,
        },
      });
      return data;
    },
    enabled: !!location && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: async ({
      messages,
      shopId,
    }: {
      messages: ChatMessage[];
      shopId?: string;
    }) => {
      const { data } = await api.post('/ai/chat', { messages, shopId });
      return data;
    },
  });
}
