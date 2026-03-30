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

function AuthBootstrap() {
  const router = useRouter();
  const { accessToken, isAuthenticated, logout } = useAuthStore();

  React.useEffect(() => {
    const publicRoutes = ['/login', '/register', '/auth/google/callback', '/404'];
    const isPublicRoute = publicRoutes.some((route) => router.pathname.startsWith(route));
    if (!accessToken || !isAuthenticated || isPublicRoute) {
      return;
    }

    let cancelled = false;
    const validateSession = async () => {
      try {
        await api.get('/users/me');
      } catch {
        if (!cancelled) {
          logout();
          router.replace('/login');
        }
      }
    };

    validateSession();

    return () => {
      cancelled = true;
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
