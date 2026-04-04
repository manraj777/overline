/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── M3 Admin Design System ── */
        primary: {
          DEFAULT: '#4648d4',
          container: '#6063ee',
          fixed: '#e0e0ff',
          50: '#eef0ff',
          100: '#dfe2ff',
          200: '#c7caff',
          300: '#a3a5ff',
          400: '#7c7dfc',
          500: '#4648d4',
          600: '#4648d4',
          700: '#3537b8',
          800: '#2c2e95',
          900: '#272976',
          950: '#181945',
        },
        secondary: {
          DEFAULT: '#6b38d4',
          container: '#8455ef',
          fixed: '#f0e6ff',
        },
        tertiary: {
          DEFAULT: '#006c49',
          container: '#00a870',
          fixed: '#d4fce6',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          container: '#e5eeff',
          'container-low': '#eff2ff',
          'container-high': '#d8dfff',
        },
        'on-surface': {
          DEFAULT: '#0b1c30',
          variant: '#3a4565',
        },
        outline: {
          DEFAULT: '#6b7a99',
          variant: '#c0c9e0',
        },
        'inverse-surface': '#0b1c30',
        'inverse-on-surface': '#edf1ff',

        /* Legacy aliases for gradual migration */
        admin: {
          100: '#dce3ff',
          300: '#a3a5ff',
          500: '#4648d4',
          700: '#3537b8',
          900: '#181945',
        },
        sidebar: {
          DEFAULT: '#181945',
          hover: '#272976',
        },
      },
      fontFamily: {
        sans: ['var(--font-admin-body)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-admin-display)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(70, 72, 212, 0.06), inset 0 0 0 1px rgba(255,255,255,0.08)',
        'card-m3': '0 1px 3px rgba(11, 28, 48, 0.05), 0 4px 12px rgba(11, 28, 48, 0.03)',
        'card-hover': '0 8px 28px rgba(11, 28, 48, 0.08), 0 2px 8px rgba(11, 28, 48, 0.04)',
        button: '0 2px 12px rgba(70, 72, 212, 0.35)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
