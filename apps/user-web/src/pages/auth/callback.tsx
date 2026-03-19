import React from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/auth';
import { Loading } from '@/components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  React.useEffect(() => {
    const completeAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token') || params.get('accessToken');
      const refreshToken = params.get('refreshToken') || '';
      const userStr = params.get('user');
      const error = params.get('error');

      if (error || !token) {
        router.replace('/auth/login?error=google_auth_failed');
        return;
      }

      try {
        let user = userStr ? JSON.parse(userStr) : null;

        if (!user) {
          const me = await fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!me.ok) {
            throw new Error('Unable to fetch user profile');
          }

          user = await me.json();
        }

        login(user, token, refreshToken);

        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token, refreshToken: refreshToken || token }),
        });

        router.replace('/');
      } catch {
        router.replace('/auth/login?error=google_auth_failed');
      }
    };

    void completeAuth();
  }, [login, router]);

  return <Loading text="Signing you in..." />;
}
