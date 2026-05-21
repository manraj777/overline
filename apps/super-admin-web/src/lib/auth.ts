import { create } from 'zustand';
import { platformApi } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await platformApi.login(email, password);
      if (data.user?.role !== 'SUPER_ADMIN' && data.user?.role !== 'SUPERADMIN') {
        set({ error: 'Access denied. Super Admin role required.', isLoading: false });
        return;
      }
      localStorage.setItem('sa_token', data.accessToken);
      localStorage.setItem('sa_refresh', data.refreshToken);
      localStorage.setItem('sa_user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Login failed',
        isLoading: false,
      });
    }
  },

  logout: () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_refresh');
    localStorage.removeItem('sa_user');
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  loadSession: async () => {
    const token = localStorage.getItem('sa_token');
    const cached = localStorage.getItem('sa_user');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      if (cached) {
        const user = JSON.parse(cached);
        set({ user, isAuthenticated: true, isLoading: false });
      }
      const { data } = await platformApi.me();
      if (data.role !== 'SUPER_ADMIN' && data.role !== 'SUPERADMIN') {
        set({ isAuthenticated: false, isLoading: false, user: null });
        localStorage.removeItem('sa_token');
        return;
      }
      localStorage.setItem('sa_user', JSON.stringify(data));
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('sa_token');
      localStorage.removeItem('sa_user');
      set({ isAuthenticated: false, isLoading: false, user: null });
    }
  },
}));
