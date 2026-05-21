import '../styles/globals.css';
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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ThemeProvider } from 'next-themes';
import {
  canAccessPath,
  getDefaultRouteForRole,
  getLegacyRedirectForRole,
  isPublicRoute,
} from '@/lib/role-routing';

const inter = {
  variable: 'font-sans',
};

function AuthBootstrap() {
  const router = useRouter();
  const { accessToken, isAuthenticated, logout } = useAuthStore();
  
  usePushNotifications(isAuthenticated);
  const lastValidatedAtRef = React.useRef(0);
  const lastValidatedTokenRef = React.useRef<string | null>(null);

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

    const now = Date.now();
    const tokenChanged = lastValidatedTokenRef.current !== accessToken;
    const shouldValidate = tokenChanged || now - lastValidatedAtRef.current > 2 * 60 * 1000;

    if (!shouldValidate) {
      return;
    }

    let cancelled = false;
    const validateSession = async () => {
      try {
        await api.get('/users/me');
        if (!cancelled) {
          lastValidatedAtRef.current = Date.now();
          lastValidatedTokenRef.current = accessToken;
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          logout();
          router.replace('/login');
        }
      }
    };

    const timer = setTimeout(validateSession, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, isAuthenticated, logout, router]);

  return null;
}

import { NewBookingAlertModal } from '@/components/ui/NewBookingAlertModal';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className={`${inter.variable} font-sans`}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <ToastProvider>
              <AuthBootstrap />
              <AdminLayout>
                <Component {...pageProps} />
              </AdminLayout>
              <NewBookingAlertModal />
            </ToastProvider>
          </ErrorBoundary>
        </QueryClientProvider>
      </div>
    </ThemeProvider>
  );
}
