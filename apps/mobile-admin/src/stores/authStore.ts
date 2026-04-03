import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authApi, shopApi, otpApi} from '../api/client';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  shops?: Array<{
    id: string;
    name: string;
  }>;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedShopId: string | null;
  isOwner: boolean;
  isStaff: boolean;

  // OTP 2FA state
  pendingOtpVerification: boolean;
  otpPhone: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  completeOtpVerification: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setSelectedShop: (shopId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  selectedShopId: null,
  isOwner: false,
  isStaff: false,
  pendingOtpVerification: false,
  otpPhone: null,

  login: async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const {accessToken, refreshToken, user} = response.data;

      // Validate admin role
      const adminRoles = ['SUPER_ADMIN', 'OWNER', 'STAFF'];
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
        shops = shopsResponse.data?.shops || shopsResponse.data || [];
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
        } catch (error: any) {
          throw new Error(
            error?.response?.data?.message ||
              'Failed to send OTP for verification. Please try again.',
          );
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
    set({
      isAuthenticated: true,
      pendingOtpVerification: false,
      otpPhone: null,
      isOwner:
        useAuthStore.getState().user?.role === 'OWNER' ||
        useAuthStore.getState().user?.role === 'SUPER_ADMIN',
      isStaff: useAuthStore.getState().user?.role === 'STAFF',
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
      const user = response.data;

      // Fetch user's shops
      let shops: Array<{id: string; name: string}> = [];
      try {
        const shopsResponse = await shopApi.getMyShops();
        shops = shopsResponse.data?.shops || shopsResponse.data || [];
      } catch {
        // User may not have shops yet
      }

      const userWithShops = {...user, shops};
      const isOwner = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
      const isStaff = user.role === 'STAFF';

      // Restore selected shop from storage or use first shop
      const storedShopId = await AsyncStorage.getItem('selected_shop_id');
      const defaultShopId =
        storedShopId && shops.some((s: any) => s.id === storedShopId)
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
