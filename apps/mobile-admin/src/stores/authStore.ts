import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {authApi, shopApi, otpApi, initApiUrl} from '../api/client';

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

type AuthRequestedRole = 'OWNER' | 'STAFF' | 'USER' | 'SUPER_ADMIN';

interface ShopApiResponse {
  shops?: ShopSummary[];
}

interface StaffAssignedShop {
  id: string;
  name: string;
  address: string;
  city: string;
  coverPhotoUrl?: string | null;
}

interface AuthState {
  user: AuthAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedShopId: string | null;
  isOwner: boolean;
  isStaff: boolean;
  token: string | null;

  // OTP 2FA state
  pendingOtpVerification: boolean;
  otpPhone: string | null;
  otpConfirmation: any | null;

  // Actions
  login: (email: string, password: string, options?: {requestedRole?: string}) => Promise<void>;
  fetchAssignedStaffShops: (phone: string) => Promise<StaffAssignedShop[]>;
  staffLogin: (params: {shopId: string; phone: string; password: string}) => Promise<void>;
  loginWithGoogle: (idToken: string, options?: {requestedRole?: AuthRequestedRole}) => Promise<void>;
  sendPhoneLoginOtp: (
    phone: string,
    options?: {requestedRole?: AuthRequestedRole; selectedShopId?: string},
  ) => Promise<void>;
  verifyPhoneLoginOtp: (
    phone: string,
    otp: string,
    options?: {requestedRole?: AuthRequestedRole; selectedShopId?: string},
  ) => Promise<void>;
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
  token: null,
  pendingOtpVerification: false,
  otpPhone: null,
  otpConfirmation: null,

  fetchAssignedStaffShops: async (phone: string) => {
    const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;
    const response = await authApi.getAssignedStaffShops(normalizedPhone);
    const data = response.data as {shops?: StaffAssignedShop[]};
    return Array.isArray(data.shops) ? data.shops : [];
  },

  staffLogin: async ({shopId, phone, password}) => {
    // Implement staff login using the specialized 6-digit PIN flow for the specific shop
    const response = await authApi.staffPinLogin({ shopId, phone, password });
    const { accessToken, refreshToken, user } = response.data as AuthLoginResponse;

    await AsyncStorage.setItem('admin_token', accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem('admin_refresh_token', refreshToken);
    }
    await AsyncStorage.setItem('selected_shop_id', shopId);

    // Staff only belongs to one shop in this context
    const shops = [{ id: shopId, name: 'Assigned Shop' }];
    const userWithShops = { ...user, shops };

    set({
      user: userWithShops,
      isAuthenticated: true,
      selectedShopId: shopId,
      isOwner: false,
      isStaff: true,
      token: accessToken,
      pendingOtpVerification: false,
    });
  },

  loginWithGoogle: async (idToken: string, options?: {requestedRole?: AuthRequestedRole}) => {
    const response = await authApi.googleLogin(idToken, options);
    const {accessToken, refreshToken, user} = response.data as AuthLoginResponse;

    const adminRoles: AdminRole[] = ['SUPER_ADMIN', 'OWNER', 'STAFF'];
    if (!adminRoles.includes(user.role)) {
      throw new Error('Access denied. This app is for shop owners and staff only.');
    }

    await AsyncStorage.setItem('admin_token', accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem('admin_refresh_token', refreshToken);
    }

    let shops: ShopSummary[] = [];
    try {
      const shopsResponse = await shopApi.getMyShops();
      shops = normalizeShops(shopsResponse.data);
    } catch {
      shops = [];
    }

    const userWithShops = {...user, shops};
    const defaultShopId = shops[0]?.id || null;

    set({
      user: userWithShops,
      isAuthenticated: true,
      selectedShopId: defaultShopId,
      isOwner: user.role === 'OWNER' || user.role === 'SUPER_ADMIN',
      isStaff: user.role === 'STAFF',
      token: accessToken,
      pendingOtpVerification: false,
      otpPhone: null,
    });
  },

  sendPhoneLoginOtp: async (
    phone: string,
    options?: {requestedRole?: AuthRequestedRole; selectedShopId?: string},
  ) => {
    await otpApi.send(phone, 'LOGIN');
    set({
      otpPhone: phone,
      otpConfirmation: null,
      pendingOtpVerification: true,
    });
  },

  verifyPhoneLoginOtp: async (
    phone: string,
    otp: string,
    options?: {requestedRole?: AuthRequestedRole; selectedShopId?: string},
  ) => {
    const response = await otpApi.verify(phone, otp, 'LOGIN', options?.requestedRole);
    const {accessToken, refreshToken, user} = response.data as AuthLoginResponse;

    const adminRoles: AdminRole[] = ['SUPER_ADMIN', 'OWNER', 'STAFF'];
    if (!adminRoles.includes(user.role)) {
      throw new Error('Access denied. This app is for shop owners and staff only.');
    }

    await AsyncStorage.setItem('admin_token', accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem('admin_refresh_token', refreshToken);
    }

    let shops: ShopSummary[] = [];
    try {
      const shopsResponse = await shopApi.getMyShops();
      shops = normalizeShops(shopsResponse.data);
    } catch {
      shops = [];
    }

    const userWithShops = {...user, shops};
    const defaultShopId =
      options?.selectedShopId && shops.some((shop) => shop.id === options.selectedShopId)
        ? options.selectedShopId
        : shops[0]?.id || null;

    if (options?.requestedRole === 'STAFF' && user.role !== 'STAFF') {
      throw new Error('Access denied. This OTP is not linked to a staff account.');
    }

    if (options?.requestedRole === 'OWNER' && user.role === 'STAFF') {
      throw new Error('Access denied. Please use staff login for this account.');
    }

    set({
      user: userWithShops,
      isAuthenticated: true,
      selectedShopId: defaultShopId,
      isOwner: user.role === 'OWNER' || user.role === 'SUPER_ADMIN',
      isStaff: user.role === 'STAFF',
      token: accessToken,
      pendingOtpVerification: false,
      otpPhone: null,
      otpConfirmation: null,
    });
  },

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
          const normalizedPhone = user.phone.startsWith('+') ? user.phone : `+91${user.phone.replace(/\D/g, '')}`;
          await otpApi.send(normalizedPhone, 'LOGIN');
          set({
            user: userWithShops,
            pendingOtpVerification: true,
            otpPhone: normalizedPhone,
            otpConfirmation: null,
            selectedShopId: defaultShopId,
            isOwner,
            isStaff,
            token: accessToken,
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
        token: accessToken,
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
      otpConfirmation: null,
      isOwner: false,
      isStaff: false,
      token: null,
    });
  },

  checkAuth: async () => {
    try {
      await initApiUrl();
      const token = await AsyncStorage.getItem('admin_token');

      if (!token) {
        set({isAuthenticated: false, isLoading: false});
        return;
      }

      const profileRequest = authApi.getProfile();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Admin auth bootstrap timed out')), 6000);
      });
      const response = await Promise.race([profileRequest, timeoutPromise]);
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
        token,
      });
    } catch {
      await AsyncStorage.removeItem('admin_token');
      await AsyncStorage.removeItem('admin_refresh_token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        otpConfirmation: null,
        isOwner: false,
        isStaff: false,
        token: null,
      });
    }
  },

  setSelectedShop: async (shopId: string) => {
    await AsyncStorage.setItem('selected_shop_id', shopId);
    set({selectedShopId: shopId});
  },
}));
