import React from 'react';
import { useRouter } from 'next/router';
import { Loading } from '@/components/ui';

export default function GoogleCallbackPage() {
  const router = useRouter();

  React.useEffect(() => {
    const search = window.location.search;
    router.replace(`/auth/callback${search}`);
  }, [router]);

  return <Loading text="Redirecting..." />;
}
