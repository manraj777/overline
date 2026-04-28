import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  comment?: string;
  staffRating?: number;
}

export function useShopReviews(shopId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['reviews', 'shop', shopId, page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/reviews/shop/${shopId}`, {
        params: { page, limit },
      });
      return data;
    },
    enabled: !!shopId,
  });
}

export function useShopRatingStats(shopId: string) {
  return useQuery({
    queryKey: ['reviews', 'stats', shopId],
    queryFn: async () => {
      const { data } = await api.get(`/reviews/shop/${shopId}/stats`);
      return data;
    },
    enabled: !!shopId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: ['reviews', 'my'],
    queryFn: async () => {
      const { data } = await api.get('/reviews/my');
      return data;
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const { data } = await api.post('/reviews', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
