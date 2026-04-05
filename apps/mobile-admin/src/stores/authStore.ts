import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {authApi, shopApi, otpApi} from '../api/client';

type ShopSummary = {id: string; name: string};
type AdminRole = 'SUPER_ADMIN' | 'OWNER' | 'STAFF';

interface AuthAdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminRole;
  shops?: ShopSummary[];
}

interface AuthLoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthAdminUser;
}

interface ShopApiResponse {
  shops?: ShopSummary[];
}

interface AuthState {
  user: AuthAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedShopId: string | null;
  isOwner: boolean;
  isStaff: boolean;

  // OTP 2FA state
  pendingOtpVerification: boolean;
  otpPhone: string | null;

  // Actions
  login: (email: string, password: string, options?: {requestedRole?: string}) => Promise<void>;
  completeOtpVerification: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setSelectedShop: (shopId: string) => Promise<void>;
}

const normalizeShops = (payload: unknown): ShopSummary[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const maybeObject = payload as ShopApiResponse | ShopSummary[];
  const source = Array.isArray(maybeObject)
    ? maybeObject
    : Array.isArray(maybeObject.shops)
      ? maybeObject.shops
      : [];

  return source.filter(
    (item): item is ShopSummary =>
      !!item && typeof item.id === 'string' && typeof item.name === 'string',
  );
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as {message?: string} | undefined)?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  selectedShopId: null,
  isOwner: false,
  isStaff: false,
  pendingOtpVerification: false,
  otpPhone: null,

  login: async (email: string, password: string, options?: {requestedRole?: string}) => {
    try {
      const response = await authApi.login(email, password, options);
      const {accessToken, refreshToken, user} = response.data as AuthLoginResponse;

      // Validate admin role
      const adminRoles: AdminRole[] = ['SUPER_ADMIN', 'OWNER', 'STAFF'];
      if (!adminRoles.includes(user.role)) {
        throw new Error('Access denied. This app is for shop owners and staff only.');
      }

      const isOwner = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
      const isStaff = user.role === 'STAFF';

      await AsyncStorage.setItem('admin_token', accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem('admin_refresh_token', refreshToken);
      }

      // Fetch user's shops
      let shops: Array<{id: string; name: string}> = [];
      try {
        const shopsResponse = await shopApi.getMyShops();
        shops = normalizeShops(shopsResponse.data);
      } catch {
        // User may not have shops yet
      }

      const userWithShops = {...user, shops};
      const defaultShopId = shops[0]?.id || null;

      // If user has a phone, require OTP verification for 2FA
      if (user.phone) {
        try {
          await otpApi.send(user.phone, 'LOGIN');
          set({
            user: userWithShops,
            pendingOtpVerification: true,
            otpPhone: user.phone,
            selectedShopId: defaultShopId,
            isOwner,
            isStaff,
          });
          return;
        } catch (error: unknown) {
          throw new Error(toErrorMessage(error, 'Failed to send OTP for verification. Please try again.'));
        }
      }

      // No phone or OTP send failed - log in directly
      set({
        user: userWithShops,
        isAuthenticated: true,
        selectedShopId: defaultShopId,
        isOwner,
        isStaff,
      });
    } catch (error) {
      throw error;
    }
  },

  completeOtpVerification: () => {
    const state = useAuthStore.getState();
    const existingUser = state.user;

    if (!existingUser) {
      set({
        isAuthenticated: false,
        pendingOtpVerification: false,
        otpPhone: null,
        isOwner: false,
        isStaff: false,
      });
      return;
    }

    set({
      isAuthenticated: true,
      pendingOtpVerification: false,
      otpPhone: null,
      isOwner: existingUser.role === 'OWNER' || existingUser.role === 'SUPER_ADMIN',
      isStaff: existingUser.role === 'STAFF',
    });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors
    }

    await AsyncStorage.removeItem('admin_token');
    await AsyncStorage.removeItem('admin_refresh_token');
    set({
      user: null,
      isAuthenticated: false,
      selectedShopId: null,
      pendingOtpVerification: false,
      otpPhone: null,
      isOwner: false,
      isStaff: false,
    });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');

      if (!token) {
        set({isAuthenticated: false, isLoading: false});
        return;
      }

      const response = await authApi.getProfile();
      const user = response.data as AuthAdminUser;

      // Fetch user's shops
      let shops: Array<{id: string; name: string}> = [];
      try {
        const shopsResponse = await shopApi.getMyShops();
        shops = normalizeShops(shopsResponse.data);
      } catch {
        // User may not have shops yet
      }

      const userWithShops = {...user, shops};
      const isOwner = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
      const isStaff = user.role === 'STAFF';

      // Restore selected shop from storage or use first shop
      const storedShopId = await AsyncStorage.getItem('selected_shop_id');
      const defaultShopId =
        storedShopId && shops.some(s => s.id === storedShopId)
          ? storedShopId
          : shops[0]?.id || null;

      set({
        user: userWithShops,
        isAuthenticated: true,
        isLoading: false,
        selectedShopId: defaultShopId,
        isOwner,
        isStaff,
      });
    } catch {
      await AsyncStorage.removeItem('admin_token');
      await AsyncStorage.removeItem('admin_refresh_token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isOwner: false,
        isStaff: false,
      });
    }
  },

  setSelectedShop: async (shopId: string) => {
    await AsyncStorage.setItem('selected_shop_id', shopId);
    set({selectedShopId: shopId});
  },
}));
