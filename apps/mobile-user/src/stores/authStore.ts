import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { authApi } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;

  // OTP state
  otpPhone: string | null;
  otpSent: boolean;
  otpConfirmation: FirebaseAuthTypes.ConfirmationResult | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) => Promise<void>;
  sendOtp: (phone: string) => Promise<string | undefined>;
  verifyOtpSession: (otp: string) => Promise<void>;
  verifyOtpCode: (otp: string, name?: string) => Promise<void>;
  completeOtpLogin: (user: User, accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  token: null,
  otpPhone: null,
  otpSent: false,
  otpConfirmation: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await authApi.login(email, password);
      await AsyncStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false, token: data.accessToken });
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  googleLogin: async (idToken) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await authApi.googleLogin(idToken);
      await AsyncStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false, token: data.accessToken });
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Google login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  signup: async data => {
    try {
      set({ isLoading: true, error: null });
      const { data: response } = await authApi.signup(data);
      await AsyncStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.refreshToken);
      }
      set({ user: response.user, isAuthenticated: true, isLoading: false, token: response.accessToken });
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Signup failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  sendOtp: async (phone: string) => {
    try {
      set({ error: null });
      const confirmation = await auth().signInWithPhoneNumber(phone);
      set({ otpPhone: phone, otpSent: true, otpConfirmation: confirmation });
      return undefined;
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to send OTP. Please try again.';
      set({ error: message });
      throw error;
    }
  },

  verifyOtpSession: async (otp: string) => {
    const state = _get();
    if (!state.otpConfirmation) {
      throw new Error('OTP session expired. Please request a new code.');
    }

    try {
      set({ error: null });
      const credential = await state.otpConfirmation.confirm(otp);
      if (!credential) {
        throw new Error('OTP confirmation failed. Please request a new code.');
      }

      // Keep OTP verification separate from login for registration flow.
      await auth().signOut().catch(() => undefined);
      set({ otpSent: false, otpConfirmation: null });
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || 'Invalid OTP. Please try again.';
      set({ error: message });
      throw error;
    }
  },

  verifyOtpCode: async (otp: string, name?: string) => {
    const state = _get();
    if (!state.otpConfirmation) {
      throw new Error('OTP session expired. Please request a new code.');
    }

    try {
      set({ error: null });
      const credential = await state.otpConfirmation.confirm(otp);
      if (!credential) {
        throw new Error('OTP confirmation failed. Please request a new code.');
      }
      const idToken = await credential.user.getIdToken(true);
      const { data } = await authApi.firebasePhoneLogin(idToken, name);
      await state.completeOtpLogin(data.user, data.accessToken, data.refreshToken);
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || 'Invalid OTP. Please try again.';
      set({ error: message });
      throw error;
    }
  },

  completeOtpLogin: async (user: User, accessToken?: string, refreshToken?: string) => {
    if (accessToken) {
      await AsyncStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: accessToken || null,
      otpPhone: null,
      otpSent: false,
      otpConfirmation: null,
    });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    set({
      user: null,
      isAuthenticated: false,
      error: null,
      token: null,
      otpPhone: null,
      otpSent: false,
      otpConfirmation: null,
    });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const profileRequest = authApi.me();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth bootstrap timed out')), 6000);
      });
      const { data } = await Promise.race([profileRequest, timeoutPromise]);
      set({ user: data, isAuthenticated: true, isLoading: false, token });
    } catch {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      set({ isLoading: false, isAuthenticated: false, user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));
