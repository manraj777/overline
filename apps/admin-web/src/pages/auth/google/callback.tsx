import React from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/auth';
import { Loading } from '@/components/ui';
import { getDefaultRouteForRole } from '@/lib/role-routing';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userStr = params.get('user');
    const error = params.get('error');

    if (error || !accessToken || !refreshToken || !userStr) {
      router.replace('/login?error=google_auth_failed');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      // Admin login stores shopId if available
      login(user, accessToken, refreshToken, user.shopId);

      router.replace(getDefaultRouteForRole(user.role));
    } catch {
      router.replace('/login?error=google_auth_failed');
    }
  }, [router, login]);

  return <Loading text="Signing in with Google..." />;
}
