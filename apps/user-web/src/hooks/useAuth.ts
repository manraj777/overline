import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useBookingStore } from '@/stores/booking';
import type { User, AuthResponse } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials extends LoginCredentials {
  name: string;
  phone?: string;
}

interface SendOtpPayload {
  phone: string;
  purpose?: 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE';
}

interface VerifyOtpPayload {
  phone: string;
  otp: string;
  purpose?: 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE';
}

interface FirebasePhoneLoginPayload {
  idToken: string;
}

async function persistSession(accessToken: string, refreshToken: string) {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
}

async function clearSession() {
  await fetch('/api/auth/session', {
    method: 'DELETE',
  });
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
      void persistSession(data.accessToken, data.refreshToken);
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
      void persistSession(data.accessToken, data.refreshToken);
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
      useBookingStore.getState().reset();
      queryClient.clear();
      void clearSession();
    },
    onError: () => {
      logout();
      useBookingStore.getState().reset();
      queryClient.clear();
      void clearSession();
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

export function useGoogleLogin() {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation<AuthResponse, Error, string>({
    mutationFn: async (idToken: string) => {
      const { data } = await api.post('/auth/google', { idToken });
      return data;
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user', 'me'], data.user);
      void persistSession(data.accessToken, data.refreshToken);
    },
  });
}

export function useSendOtp() {
  return useMutation<{ message: string; expiresAt: string; devOtp?: string }, Error, SendOtpPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/otp/send', {
        phone: payload.phone,
        purpose: payload.purpose || 'LOGIN',
      });
      return data;
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation<AuthResponse, Error, VerifyOtpPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/otp/login', {
        phone: payload.phone,
        otp: payload.otp,
        purpose: payload.purpose || 'LOGIN',
      });
      return data;
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user', 'me'], data.user);
      void persistSession(data.accessToken, data.refreshToken);
    },
  });
}

export function useFirebasePhoneLogin() {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();

  return useMutation<AuthResponse, Error, FirebasePhoneLoginPayload>({
    mutationFn: async ({ idToken }) => {
      const { data } = await api.post('/auth/firebase/phone-login', { idToken });
      return data;
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user', 'me'], data.user);
      void persistSession(data.accessToken, data.refreshToken);
    },
  });
}

export function useResetPassword() {
  return useMutation<{ message: string }, Error, any>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/auth/reset-password', payload);
      return data;
    },
  });
}
