import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from '../utils/deviceInfo';
import { Config } from '../config';
import { resolveApiUrl } from './urlResolver';

// Configure API base URL from centralized config
let API_BASE_URL = Config.API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Config.TIMEOUTS.API_REQUEST,
  headers: { 'Content-Type': 'application/json' },
});

export async function initApiUrl() {
  try {
    const { apiBase } = await resolveApiUrl();
    api.defaults.baseURL = apiBase;
    console.log('[User API Client] Dynamic baseURL resolved:', api.defaults.baseURL);
  } catch (err) {
    console.error('[User API Client] Failed to resolve dynamic baseURL:', err);
  }
}

initApiUrl().catch(() => {});

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Add auth token and device info to requests
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add device fingerprint for fraud detection
  const deviceFingerprint = DeviceInfo.getFingerprint();
  config.headers['X-Device-Id'] = deviceFingerprint;
  config.headers['X-Platform'] = Platform.OS;
  config.headers['X-App-Version'] = '1.0.0';
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken;
        await AsyncStorage.setItem('accessToken', newAccessToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) => api.post('/auth/signup', data),
  googleLogin: (idToken: string) =>
    api.post('/auth/google', { idToken }),
  firebasePhoneLogin: (idToken: string, name?: string) =>
    api.post('/auth/firebase/phone-login', { idToken, name }),
  me: () => api.get('/users/me'),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  resetPassword: (data: { identifier: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
};

// Shops API
export const shopsApi = {
  list: (params?: {
    city?: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    minRating?: number;
    maxPrice?: number;
    type?: string;
    search?: string;
  }) => {
    const mappedParams = {
      city: params?.city,
      latitude: params?.latitude ?? params?.lat,
      longitude: params?.longitude ?? params?.lng,
      radiusKm: params?.radiusKm,
      minRating: params?.minRating,
      maxPrice: params?.maxPrice,
      type: params?.type,
      query: params?.search,
    };

    return api.get('/shops', { params: mappedParams });
  },
  getBySlug: (slug: string) => api.get(`/shops/${slug}`),
  getServices: (shopId: string) => api.get(`/shops/${shopId}/services`),
  getQueue: (shopId: string) => api.get(`/shops/${shopId}/queue`),
  getCities: () => api.get('/shops/cities'),
  getNearby: (params: { lat: number; long: number; radiusKm?: number }) =>
    api.get('/shops/nearby', { params }),
};

// Queue API - for available time slots
export const queueApi = {
  getSlots: (
    shopId: string,
    params: { date: string; serviceIds?: string[]; duration?: number; staffId?: string },
  ) => {
    const { serviceIds, ...rest } = params;
    return api.get(`/queue/slots/${shopId}`, {
      params: {
        ...rest,
        ...(serviceIds && serviceIds.length > 0 ? { serviceIds: serviceIds.join(',') } : {}),
      },
    });
  },
  getNextSlot: (shopId: string, params?: { serviceIds?: string[] }) => {
    const serviceIds = params?.serviceIds;
    return api.get(`/queue/next-slot/${shopId}`, {
      params: {
        ...(serviceIds && serviceIds.length > 0 ? { serviceIds: serviceIds.join(',') } : {}),
      },
    });
  },
  getPosition: (bookingId: string) =>
    api.get(`/queue/position/${bookingId}`),
};

// Bookings API
export const bookingsApi = {
  create: (data: {
    shopId: string;
    serviceIds: string[];
    startTime: string;
    staffId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    notes?: string;
    offerCode?: string;
  }) => api.post('/bookings', data),
  createGuest: (data: {
    shopId: string;
    serviceIds: string[];
    startTime: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
  }) => api.post('/bookings/guest', data),
  // Server-side price breakdown — single source of truth.
  // Returns: { subtotal, taxesAndCharges, discount, freeCashUsed, finalAmount, currency }
  calculatePrice: (data: {
    shopId: string;
    serviceIds: string[];
    offerCode?: string;
  }) => api.post('/bookings/calculate-price', data),
  getMy: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/bookings/my', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  cancel: (id: string) => api.patch(`/bookings/${id}/cancel`),
  cancelWithReason: (id: string, data: { reason: string }) =>
    api.patch(`/bookings/${id}/cancel-with-reason`, data),
  reschedule: (id: string, data: { startTime: string }) =>
    api.patch(`/bookings/${id}/reschedule`, data),
  lookup: (bookingNumber: string) =>
    api.get(`/bookings/lookup/${bookingNumber}`),
};

// Wallet API
export const walletApi = {
  get: () => api.get('/wallet'),
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params?: {
    take?: number;
    skip?: number;
    type?: string;
  }) => api.get('/wallet/transactions', { params }),
};

// User API
export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) =>
    api.patch('/users/me', data),
  sendOtp: () => api.post('/users/me/otp/send'),
  verifyOtp: (data: { otp: string }) => api.post('/users/me/otp/verify', data),
};

// Reviews API
export const reviewsApi = {
  getByShop: (shopId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/shop/${shopId}`, { params }),
  getStats: (shopId: string) => api.get(`/reviews/shop/${shopId}/stats`),
  create: (data: { bookingId: string; rating: number; comment?: string }) =>
    api.post('/reviews', data),
  getMy: () => api.get('/reviews/my'),
};

// Notifications API
export const notificationsApi = {
  get: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// OTP API - phone-based authentication
export const otpApi = {
  send: (phone: string, purpose: string = 'LOGIN') =>
    api.post('/otp/send', { phone, purpose }),
  verify: (
    phone: string,
    otp: string,
    purpose: string = 'LOGIN',
    requestedRole?: string,
    name?: string,
  ) => api.post('/otp/verify', { phone, otp, purpose, requestedRole, name }),
  login: (phone: string, otp: string, requestedRole?: string, name?: string) =>
    api.post('/otp/login', { phone, otp, purpose: 'LOGIN', requestedRole, name }),
};

// Payments API
export const paymentsApi = {
  createIntent: (data: { bookingId: string; amount: number }) =>
    api.post('/payments/create-intent', data),
  createOrder: (data: {
    bookingId: string;
    amount?: number;
    method?: 'ONLINE' | 'WALLET' | 'PAY_AT_SHOP';
  }) => api.post('/payments/create-order', data),
  verifyRazorpay: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post('/payments/verify', data),
  getStatus: (id: string) => api.get(`/payments/${id}`),
};

// Cart API
export const cartApi = {
  get: () => api.get('/cart'),
  update: (data: { shopId: string; items: Array<{ serviceId: string; staffId?: string }> }) =>
    api.post('/cart', data),
  add: (data: { shopId: string; items: Array<{ serviceId: string; staffId?: string }> }) =>
    api.post('/cart/add', data),
  clear: () => api.delete('/cart'),
};

export default api;
