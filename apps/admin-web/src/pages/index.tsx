import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/auth';
import { getDefaultRouteForRole } from '@/lib/role-routing';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getDefaultRouteForRole(user?.role));
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, user?.role, router]);

  return null;
}
