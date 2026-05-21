import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sa_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sa_token');
      localStorage.removeItem('sa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

export const platformApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password, requestedRole: 'SUPER_ADMIN' }),
  me: () => api.get('/users/me'),
  getStats: () => api.get('/admin/platform/stats'),
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/admin/platform/users', { params }),
  getShops: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/platform/shops', { params }),
  getUser: (id: string) => api.get(`/admin/platform/users/${id}`),
  getShop: (id: string) => api.get(`/admin/platform/shops/${id}`),
  toggleUserActive: (id: string, isActive: boolean) =>
    api.patch(`/admin/platform/users/${id}`, { isActive }),
  toggleShopActive: (id: string, isActive: boolean) =>
    api.patch(`/admin/platform/shops/${id}`, { isActive }),
};
