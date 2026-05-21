/** @type {import('next').NextConfig} */
const path = require('path');

// Resolve React from wherever pnpm actually placed it for this app
const resolveReact = (pkg) => {
  try {
    // First try the app's own node_modules
    return path.dirname(require.resolve(`${pkg}/package.json`, { paths: [__dirname] }));
  } catch {
    // Fallback to any resolvable location
    return path.dirname(require.resolve(`${pkg}/package.json`));
  }
};

const reactPath = resolveReact('react');
const reactDomPath = resolveReact('react-dom');

const nextConfig = {
  optimizeFonts: false,
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  transpilePackages: ['@overline/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Fix React version resolution in pnpm monorepo — ensures react and react-dom
  // use the same React instance (prevents react@19 from mobile apps conflicting
  // with react@18 needed by Next.js 14 web apps)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactPath,
      'react-dom': reactDomPath,
    };

    // Also ensure react-dom/server and react-dom/client resolve correctly
    if (isServer) {
      config.resolve.alias['react-dom/server'] = path.join(reactDomPath, 'server');
    }

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
