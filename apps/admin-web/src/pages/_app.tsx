import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import React from 'react';
import { useRouter } from 'next/router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AdminLayout } from '@/components/layout';
import { ToastProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  canAccessPath,
  getDefaultRouteForRole,
  getLegacyRedirectForRole,
  isPublicRoute,
} from '@/lib/role-routing';

function AuthBootstrap() {
  const router = useRouter();
  const { accessToken, isAuthenticated, logout } = useAuthStore();

  React.useEffect(() => {
    const publicPath = isPublicRoute(router.pathname);

    if (!accessToken || !isAuthenticated || publicPath) {
      return;
    }

    const user = useAuthStore.getState().user;
    if (user) {
      const legacyRedirect = getLegacyRedirectForRole(router.pathname, user.role);
      if (legacyRedirect && legacyRedirect !== router.pathname) {
        router.replace(legacyRedirect);
        return;
      }

      if (!canAccessPath(user.role, router.pathname)) {
        router.replace(getDefaultRouteForRole(user.role));
        return;
      }
    }

    let cancelled = false;
    const validateSession = async () => {
      try {
        await api.get('/users/me');
      } catch (err: any) {
        // Only logout on definitive 401/403 — NOT on network/CORS errors
        const status = err?.response?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          logout();
          router.replace('/login');
        }
      }
    };

    // Small delay to allow hydration to complete before validating
    const timer = setTimeout(validateSession, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, isAuthenticated, logout, router]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthBootstrap />
        <ToastProvider>
          <AdminLayout>
            <Component {...pageProps} />
          </AdminLayout>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
