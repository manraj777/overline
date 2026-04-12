import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User, AuthResponse } from '@/types';
import { getDefaultRouteForRole, isAdminRole } from '@/lib/role-routing';

interface LoginCredentials {
  email: string;
  password: string;
}

interface FirebasePhoneLoginPayload {
  idToken: string;
  requestedRole?: string;
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
  const { login, setShopId } = useAuthStore();

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/login', credentials);
      if (!isAdminRole(data.user.role)) {
        throw new Error('Access denied. Admin access only.');
      }
      return data;
    },
    onSuccess: async (data) => {
      // Login first to set the token for subsequent API calls
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['admin', 'user', 'me'], data.user);

      // Fetch shops accessible to this user and auto-set the first one
      try {
        const { data: shops } = await api.get('/admin/my-shops');
        if (shops && shops.length > 0) {
          setShopId(shops[0].id);
          queryClient.setQueryData(['admin', 'my-shops'], shops);
        }
      } catch (err) {
        console.error('Failed to fetch shops:', err);
      }
    },
  });
}

export function useRegisterShop() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string; slug: string; name: string; verificationStatus: string; isActive: boolean }, Error, any>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/auth/register-shop', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
}

export function useMyShops() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'my-shops'],
    queryFn: async () => {
      const { data } = await api.get('/admin/my-shops');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
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

export function useGoogleLogin() {
  const queryClient = useQueryClient();
  const { login, setShopId } = useAuthStore();

  return useMutation<AuthResponse, Error, string>({
    mutationFn: async (idToken: string) => {
      const { data } = await api.post('/auth/google', { idToken });
      if (!isAdminRole(data.user.role)) {
        throw new Error('Access denied. Admin access only.');
      }
      return data;
    },
    onSuccess: async (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['admin', 'user', 'me'], data.user);

      // Fetch shops accessible to this user and auto-set the first one
      try {
        const { data: shops } = await api.get('/admin/my-shops');
        if (shops && shops.length > 0) {
          setShopId(shops[0].id);
          queryClient.setQueryData(['admin', 'my-shops'], shops);
        }
      } catch (err) {
        console.error('Failed to fetch shops:', err);
      }
    },
  });
}

export function useFirebasePhoneLogin() {
  const queryClient = useQueryClient();
  const { login, setShopId } = useAuthStore();

  return useMutation<AuthResponse, Error, FirebasePhoneLoginPayload>({
    mutationFn: async ({ idToken, requestedRole }) => {
      const { data } = await api.post('/auth/firebase/phone-login', { idToken, requestedRole });
      if (!isAdminRole(data.user.role)) {
        throw new Error('Access denied. Admin access only.');
      }
      return data;
    },
    onSuccess: async (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['admin', 'user', 'me'], data.user);

      try {
        const { data: shops } = await api.get('/admin/my-shops');
        if (shops && shops.length > 0) {
          setShopId(shops[0].id);
          queryClient.setQueryData(['admin', 'my-shops'], shops);
        }
      } catch (err) {
        console.error('Failed to fetch shops:', err);
      }
    },
  });
}

export function getPostLoginRedirect(role?: User['role']) {
  return getDefaultRouteForRole(role);
}
