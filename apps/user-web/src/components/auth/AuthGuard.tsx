import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/auth';

const publicRoutes = ['/auth/login', '/auth/signup', '/auth/google/callback', '/auth/verify-phone'];
// Only enforce phone verification for routes that actually need it (booking flows)
const phoneRequiredRoutes = ['/bookings', '/book'];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    useAuthStore.getState().setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!mounted || isLoading) return;

    const path = router.pathname;
    const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));
    const requiresPhone = phoneRequiredRoutes.some((route) => path.startsWith(route));

    if (isAuthenticated && user) {
      // Only force phone verification when trying to access booking-specific routes
      if (!user.isPhoneVerified && requiresPhone) {
        router.replace('/auth/verify-phone');
      }
    }
  }, [mounted, isAuthenticated, user, isLoading, router.pathname, router]);

  // Always return children to prevent Next.js SSR hydration mismatch!
  // The useEffect will instantly redirect the user if they are unauthorized.
  return <>{children}</>;
};
