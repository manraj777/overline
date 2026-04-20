import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { Layout } from '@/components/layout';
import { ToastProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SmoothScrollProvider } from '@/components/layout/SmoothScrollProvider';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ThemeProvider } from 'next-themes';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
        <SmoothScrollProvider>
          <div className={`${inter.variable} font-sans`}>
            <ToastProvider>
              <Layout>
                <AuthGuard>
                  <Component {...pageProps} />
                </AuthGuard>
              </Layout>
            </ToastProvider>
          </div>
        </SmoothScrollProvider>
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    </ThemeProvider>
  );
}
