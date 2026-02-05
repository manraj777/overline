import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AdminLayout } from '@/components/layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminLayout>
        <Component {...pageProps} />
      </AdminLayout>
    </QueryClientProvider>
  );
}
