import React from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/auth';
import { Loading } from '@/components/ui';

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
      router.replace('/auth/login?error=google_auth_failed');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      login(user, accessToken, refreshToken);
      if (!user.isPhoneVerified) {
        router.replace('/auth/verify-phone');
      } else {
        router.replace('/');
      }
    } catch {
      router.replace('/auth/login?error=google_auth_failed');
    }
  }, [router, login]);

  return <Loading text="Signing in with Google..." />;
}
