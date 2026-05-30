import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { Layout } from '@/components/layout';
import { ToastProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SmoothScrollProvider } from '@/components/layout/SmoothScrollProvider';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ThemeProvider } from 'next-themes';
import '../lib/i18n';

const inter = {
  variable: 'font-sans',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
    {GA_ID && (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{page_path:window.location.pathname});`}
        </Script>
      </>
    )}
    </ThemeProvider>
  );
}
