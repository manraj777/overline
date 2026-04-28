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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Overline Admin - Salons & Queue Management</title>
        <meta name="description" content="Manage your salon, track queues, and view analytics securely with Overline Admin." />
      </Head>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-gray-900">Overline Admin</div>
          <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Log in</Link>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-sm border text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome to Overline</h1>
          <p className="text-gray-600 text-lg">
            Manage your bookings, staff, and customer queues seamlessly.
          </p>
          <div className="pt-6">
            <button
              onClick={() => router.push('/login')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </main>
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-center space-x-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-900">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
