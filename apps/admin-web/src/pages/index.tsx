import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { getDefaultRouteForRole } from '@/lib/role-routing';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      router.replace(getDefaultRouteForRole(user?.role));
    }
  }, [isAuthenticated, user?.role, router]);

  if (!mounted || isAuthenticated) return null;

  return (
    <div className="min-h-screen ovl-admin-bg flex flex-col">
      <Head>
        <title>Overline Admin - Salons & Queue Management</title>
        <meta name="description" content="Manage your salon, track queues, and view analytics securely with Overline Admin." />
      </Head>
      <header className="bg-surface-container-lowest/70 dark:bg-surface/70 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-on-surface">Overline Admin</div>
          <Link href="/login" className="text-primary hover:text-primary-800 font-medium">Log in</Link>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 card-m3 p-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-on-surface">Welcome to Overline</h1>
          <p className="text-on-surface-variant text-lg">
            Manage your bookings, staff, and customer queues seamlessly.
          </p>
          <div className="pt-6">
            <button
              onClick={() => router.push('/login')}
              className="btn-primary w-full py-3"
            >
              Get Started
            </button>
          </div>
        </div>
      </main>
      <footer className="bg-surface-container-lowest mt-auto border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-center space-x-6 text-sm text-on-surface-variant">
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/support" className="hover:text-primary">Support</Link>
        </div>
      </footer>
    </div>
  );
}
