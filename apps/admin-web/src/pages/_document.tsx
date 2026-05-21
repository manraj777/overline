import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Overline Admin - Manage your appointments and shop" />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="bg-surface">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
