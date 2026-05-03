import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en-IN">
      <Head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/overline-logo.png" />
        <link rel="apple-touch-icon" href="/overline-logo.png" />

        {/* Theme & color-scheme — supports auto light/dark */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0b" />
        <meta name="color-scheme" content="light dark" />

        {/* Tell iOS not to auto-link booking-time strings as phone numbers */}
        <meta name="format-detection" content="telephone=no" />

        {/* Performance: preconnect to the API host */}
        <link rel="preconnect" href="https://api.overline.in" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.overline.in" />

        {/* Global Organization + WebSite JSON-LD — rendered on every page for
            sitelinks-search-box eligibility in Google. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://overline.in/#organization',
                  name: 'Overline',
                  url: 'https://overline.in',
                  logo: 'https://overline.in/overline-logo.png',
                  sameAs: [
                    'https://twitter.com/overline_in',
                    'https://www.instagram.com/overline.in',
                  ],
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://overline.in/#website',
                  url: 'https://overline.in',
                  name: 'Overline',
                  publisher: { '@id': 'https://overline.in/#organization' },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target:
                      'https://overline.in/explore?query={search_term_string}',
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
