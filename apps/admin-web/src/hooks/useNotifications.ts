import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Notification, NotificationsResponse } from '@/types';

export function useNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const { isAuthenticated, accessToken } = useAuthStore();

    return useQuery<NotificationsResponse>({
        queryKey: ['notifications', params],
        queryFn: async () => {
            const { data } = await api.get('/notifications', { params });
            return data;
        },
        enabled: isAuthenticated && !!accessToken,
        retry: false,
        refetchInterval: 30000, // Refetch every 30 seconds to get new notifications
    });
}

export function useUnreadNotificationsCount() {
    const { isAuthenticated, accessToken } = useAuthStore();

    return useQuery<{ count: number }>({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const { data } = await api.get('/notifications/unread-count');
            return data;
        },
        enabled: isAuthenticated && !!accessToken,
        retry: false,
        refetchInterval: 30000,
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.patch(`/notifications/${id}/read`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await api.patch('/notifications/read-all');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
