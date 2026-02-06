import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User, AuthResponse } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials extends LoginCredentials {
  name: string;
  phone?: string;
}

export function useUser() {
  const { isAuthenticated, accessToken } = useAuthStore();

  return useQuery<User>({
    queryKey: ['user', 'me'],
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
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user', 'me'], data.user);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation<AuthResponse, Error, SignupCredentials>({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/signup', credentials);
      return data;
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user', 'me'], data.user);
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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation<User, Error, Partial<User>>({
    mutationFn: async (updates) => {
      const { data } = await api.patch('/users/me', updates);
      return data;
    },
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(['user', 'me'], user);
    },
  });
}
