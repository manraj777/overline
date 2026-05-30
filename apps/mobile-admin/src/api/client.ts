import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from '../utils/deviceInfo';

import { resolveApiUrl } from './urlResolver';

// Backend URL configuration
const DEV_HOST =
  process.env.DEV_HOST ||
  (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const PROD_URL = 'https://api.overline.in/api/v1';
const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:3001/api/v1`
  : PROD_URL;

export async function initApiUrl() {
  try {
    const { apiBase } = await resolveApiUrl();
    apiClient.defaults.baseURL = apiBase;
    console.log('[API Client] Dynamic baseURL resolved:', apiClient.defaults.baseURL);
  } catch (err) {
    console.error('[API Client] Failed to resolve dynamic baseURL:', err);
  }
}

initApiUrl().catch(() => {});

// Create axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Request interceptor to add auth token and device info
apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add device fingerprint for fraud detection
    const deviceFingerprint = DeviceInfo.getFingerprint();
    config.headers['X-Device-Id'] = deviceFingerprint;
    config.headers['X-Platform'] = Platform.OS;
    config.headers['X-App-Version'] = '1.0.0-admin';
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor with token refresh
apiClient.interceptors.response.use(
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
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('admin_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken;
        await AsyncStorage.setItem('admin_token', newAccessToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem('admin_refresh_token', data.refreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.removeItem('admin_token');
        await AsyncStorage.removeItem('admin_refresh_token');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// Auth APIs - uses the same auth endpoints as user app
export const authApi = {
  login: (email: string, password: string, options?: { requestedRole?: string }) =>
    apiClient.post('/auth/login', { email, password, requestedRole: options?.requestedRole }),
  firebasePhoneLogin: (idToken: string) =>
    apiClient.post('/auth/firebase/phone-login', { idToken }),
  staffPinLogin: (params: { shopId: string; phone: string; password: string }) =>
    apiClient.post('/auth/staff-login', { shopId: params.shopId, phone: params.phone, pin: params.password }),
  getAssignedStaffShops: (phone: string) =>
    apiClient.post('/auth/staff/shops', { phone }),
  staffSendOtp: (params: { shopId: string; phone: string }) =>
    apiClient.post('/auth/staff/send-otp', params),
  staffVerifyOtp: (params: { shopId: string; phone: string; otp: string }) =>
    apiClient.post('/auth/staff/verify-otp', params),
  googleLogin: (idToken: string, options?: { requestedRole?: string }) =>
    apiClient.post('/auth/google', { idToken, requestedRole: options?.requestedRole }),
  getProfile: () => apiClient.get('/users/me'),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  resetPassword: (data: { identifier: string; otp: string; newPassword: string }) =>
    apiClient.post('/auth/reset-password', data),
};

// OTP APIs
export const otpApi = {
  send: (phone: string, purpose: string = 'VERIFY_PHONE') =>
    apiClient.post('/otp/send', { phone, purpose }),
  verify: (
    phone: string,
    otp: string,
    purpose: string = 'VERIFY_PHONE',
    requestedRole?: string,
  ) => apiClient.post('/otp/verify', { phone, otp, purpose, requestedRole }),
};

// Admin Dashboard APIs
export const dashboardApi = {
  getStats: (shopId: string) =>
    apiClient.get(`/admin/shops/${shopId}/dashboard`),
  getBookings: (
    shopId: string,
    params?: { date?: string; status?: string; page?: number; limit?: number },
  ) => apiClient.get(`/admin/shops/${shopId}/bookings`, { params }),
};

// Admin Bookings APIs
export const bookingsApi = {
  getAll: (
    shopId: string,
    params?: { status?: string; date?: string; page?: number; limit?: number },
  ) => apiClient.get(`/admin/shops/${shopId}/bookings`, { params }),
  getById: (id: string) => apiClient.get(`/bookings/${id}`),
  updateStatus: (bookingId: string, status: string) =>
    apiClient.patch(`/admin/bookings/${bookingId}/status`, { status }),
  verifyCode: (bookingId: string, code: string) =>
    apiClient.post(`/bookings/${bookingId}/verify-code`, { code }),
  completeService: (bookingId: string) =>
    apiClient.post(`/bookings/${bookingId}/complete`),
  cancelBooking: (bookingId: string, reason?: string) =>
    apiClient.patch(`/bookings/${bookingId}/cancel`, { reason }),
  markNoShow: (bookingId: string) =>
    apiClient.patch(`/admin/bookings/${bookingId}/status`, {
      status: 'NO_SHOW',
    }),
  createWalkIn: (
    shopId: string,
    data: { serviceIds: string[]; customerName: string; customerPhone: string },
  ) => apiClient.post(`/admin/shops/${shopId}/walk-in`, data),
  writePrescription: (id: string, data: { recommendedTests: string[]; followUpDate?: string; notes?: string }) =>
    apiClient.post(`/staff/me/bookings/${id}/prescription`, data),
};

export const queueApi = {
  callAhead: (shopId: string, bookingId: string, message?: string) =>
    apiClient.post(`/queue/${shopId}/call-ahead`, {bookingId, message}),
  skip: (shopId: string, bookingId: string, reason?: string) =>
    apiClient.post(`/queue/${shopId}/skip`, {bookingId, reason}),
  overrun: (shopId: string, bookingId: string, extraMinutes: number, note?: string) =>
    apiClient.post(`/queue/${shopId}/overrun`, {bookingId, extraMinutes, note}),
  callNext: (shopId: string, count: number, message?: string) =>
    apiClient.post('/staff/me/queue/call-next', { shopId, count, message }),
  getTrackableBookings: (shopId: string) =>
    apiClient.get(`/queue/tracking/${shopId}`),
  getMessages: (bookingId: string) =>
    apiClient.get(`/queue/tracking/${bookingId}/messages`),
  postMessage: (
    bookingId: string,
    data: {senderId: string; senderType: 'USER' | 'SHOP'; content: string},
  ) => apiClient.post(`/queue/tracking/${bookingId}/messages`, data),
};

export const reviewsApi = {
  getStaffReviews: (
    shopId: string,
    params?: {page?: number; limit?: number},
  ) => apiClient.get(`/reviews/shop/${shopId}/staff`, {params}),
  getMyStaffReviews: (
    shopId: string,
    params?: {page?: number; limit?: number},
  ) => apiClient.get(`/reviews/shop/${shopId}/staff/me`, {params}),
};

// Services APIs - uses /services/shop/:shopId
export const servicesApi = {
  getAll: (shopId: string) =>
    apiClient.get(`/services/shop/${shopId}`),
  getById: (id: string) => apiClient.get(`/services/${id}`),
  create: (
    shopId: string,
    data: {
      name: string;
      price: number;
      durationMinutes: number;
      description?: string;
      category?: string;
    },
  ) => apiClient.post(`/services/shop/${shopId}`, data),
  update: (
    id: string,
    data: {
      name?: string;
      price?: number;
      durationMinutes?: number;
      description?: string;
      isActive?: boolean;
      category?: string;
    },
  ) => apiClient.patch(`/services/${id}`, data),
  delete: (shopId: string, id: string) => apiClient.delete(`/services/${id}`), // Match schema
  approve: (id: string) => apiClient.patch(`/services/${id}/approve`),
  getSuggestions: (type: string) => apiClient.get('/services/suggestions', { params: { type } }),
};

// Shop APIs
export const shopApi = {
  createShop: (data: any) => apiClient.post('/owner/shops', data),
  registerShop: (data: any) => apiClient.post('/auth/register-shop', data),
  parseGoogleLink: (url: string) => apiClient.get('/shops/parse-google-link', { params: { url } }),
  getMyShops: () => apiClient.get('/admin/my-shops'),
  getById: (id: string) => apiClient.get(`/shops/${id}`),
  searchShops: (query: string) => apiClient.get('/shops/search', { params: { q: query } }),
  autofillFromGoogleMaps: (shopId: string, queryOrUrl: string) => apiClient.post(`/admin/shops/${shopId}/google-autofill`, { queryOrUrl }),
  getSettings: (shopId: string) =>
    apiClient.get(`/admin/shops/${shopId}/settings`),
  updateSettings: (shopId: string, data: any) =>
    apiClient.patch(`/admin/shops/${shopId}/settings`, data),
  getWorkingHours: (shopId: string) =>
    apiClient.get(`/admin/shops/${shopId}/working-hours`),
  updateWorkingHours: (shopId: string, data: any) =>
    apiClient.patch(`/admin/shops/${shopId}/working-hours`, data),
  getPayoutDetails: (shopId: string) =>
    apiClient.get(`/admin/shops/${shopId}/payout-details`),
  updatePayoutDetails: (shopId: string, data: any) =>
    apiClient.patch(`/admin/shops/${shopId}/payout-details`, data),
};

// Staff APIs
export const staffApi = {
  getMe: () => apiClient.get('/admin/staff/me'),
  updateMe: (data: any) => apiClient.patch('/admin/staff/me', data),
  getAll: (shopId: string) =>
    apiClient.get(`/admin/shops/${shopId}/staff`),
  create: (
    shopId: string,
    data: { name: string; age?: number; phone: string; password?: string, role?: string }, // Updated
  ) => apiClient.post(`/admin/shops/${shopId}/staff`, data),
  update: (shopId: string, staffId: string, data: any) =>
    apiClient.patch(`/admin/shops/${shopId}/staff/${staffId}`, data),
  delete: (shopId: string, staffId: string) =>
    apiClient.delete(`/admin/shops/${shopId}/staff/${staffId}`),
  resetPin: (shopId: string, staffId: string, password?: string) =>
    apiClient.patch(`/admin/shops/${shopId}/staff/${staffId}/pin`, { password }),
};

// Analytics APIs
export const analyticsApi = {
  getSummary: (
    shopId: string,
    params?: { startDate?: string; endDate?: string },
  ) => apiClient.get(`/analytics/shops/${shopId}/summary`, { params }),
  getDaily: (
    shopId: string,
    params?: { startDate?: string; endDate?: string },
  ) => apiClient.get(`/analytics/shops/${shopId}/daily`, { params }),
  getServices: (shopId: string) =>
    apiClient.get(`/analytics/shops/${shopId}/services`),
};

// Notifications APIs
export const notificationsApi = {
  get: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get('/notifications', { params }),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export default apiClient;
