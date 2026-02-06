import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User, AuthResponse } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

export function useUser() {
  const { isAuthenticated, accessToken } = useAuthStore();

  return useQuery<User>({
    queryKey: ['admin', 'user', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 1000 * 60 * 10,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      // Check if user is OWNER or STAFF
      if (data.user.role !== 'OWNER' && data.user.role !== 'STAFF' && data.user.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. Admin access only.');
      }
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['admin', 'user', 'me'], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
    onError: () => {
      logout();
      queryClient.clear();
    },
  });
}
