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
      console.error('Google Auth callback missing params:', { error, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken, hasUserStr: !!userStr, search: window.location.search });
      router.replace('/login?error=google_auth_failed&details=missing_params');
      return;
    }

    try {
      const decodedUser = atob(userStr);
      const user = JSON.parse(decodedUser);
      // Admin login stores shopId if available
      login(user, accessToken, refreshToken, user.shopId);

      if (params.get('needsShopSetup') === 'true') {
        router.replace('/register?onboarding=true');
      } else {
        router.replace(getDefaultRouteForRole(user.role));
      }
    } catch (e) {
      console.error('Failed to parse base64 user payload from URL', e); 
      router.replace('/login?error=google_auth_failed&details=parse_error');
    }
  }, [router, login]);

  return <Loading text="Signing in with Google..." />;
}
