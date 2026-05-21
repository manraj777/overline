import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import Head from 'next/head';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loadSession } = useAuth();
  useEffect(() => { loadSession(); }, []);
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta name="google-site-verification" content="xRhwlEg_23XobxkZ9JrCsSNBmtUY9aqqVogUB7x0UfE" />
      </Head>
      <AuthGate>
        <Component {...pageProps} />
      </AuthGate>
    </QueryClientProvider>
  );
}
