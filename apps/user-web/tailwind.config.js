/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ────────────────────────────────────────────────────────── */
        /* Overline M3 Design System                                   */
        /* Surface/text/outline tokens bind to CSS vars in globals.css */
        /* so Tailwind classes automatically respect light/dark mode.  */
        /* ────────────────────────────────────────────────────────── */
        primary: {
          DEFAULT: '#d32f2f',
          50: '#ffebee',
          100: '#ffcdd2',
          200: '#ef9a9a',
          300: '#e57373',
          400: '#ef5350',
          500: '#f44336',
          600: '#e53935',
          700: '#d32f2f',
          800: '#c62828',
          900: '#b71c1c',
          950: '#7f1010',
          container: '#b71c1c',
          fixed: '#ffcdd2',
          'fixed-dim': '#ef9a9a',
        },
        secondary: {
          DEFAULT: '#27272a',
          container: '#18181b',
          fixed: '#e2e8f0',
          'fixed-dim': '#cbd5e1',
        },
        tertiary: {
          DEFAULT: '#b91c1c',
          container: '#991b1b',
          fixed: '#fca5a5',
          'fixed-dim': '#f87171',
        },
        error: {
          DEFAULT: '#ef4444',
          container: '#7f1d1d',
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        success: {
          DEFAULT: '#16a34a',
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        /* Semantic surface tokens → CSS vars (light/dark aware). */
        surface: {
          DEFAULT: 'var(--ovl-surface)',
          container: {
            DEFAULT: 'var(--ovl-surface-container)',
            low: 'var(--ovl-surface-container-low)',
            high: 'var(--ovl-surface-container-high)',
            highest: 'var(--ovl-surface-container-highest)',
            lowest: 'var(--ovl-surface-container-lowest)',
          },
          tint: 'var(--ovl-primary)',
        },
        outline: {
          DEFAULT: 'var(--ovl-outline)',
          variant: 'var(--ovl-outline-variant)',
        },
        'on-surface': {
          DEFAULT: 'var(--ovl-on-surface)',
          variant: 'var(--ovl-on-surface-variant)',
        },
        inverse: {
          surface: 'var(--ovl-inverse-surface)',
          'on-surface': 'var(--ovl-inverse-on-surface)',
          primary: '#ffcdd2',
        },
        /* `on-` prefixed tokens kept for backward compat with existing JSX. */
        on: {
          surface: 'var(--ovl-on-surface)',
          'surface-variant': 'var(--ovl-on-surface-variant)',
          primary: '#ffffff',
          'primary-container': '#ffffff',
          secondary: '#ffffff',
          'secondary-container': '#ffffff',
          tertiary: '#ffffff',
          'tertiary-container': '#ffffff',
          error: '#ffffff',
          'error-container': '#fca5a5',
          background: 'var(--ovl-on-surface)',
        },
        background: 'var(--ovl-bg)',
        /* ── Legacy tokens kept for gradual migration ── */
        brand: {
          100: '#ffcdd2',
          300: '#ef9a9a',
          500: '#d32f2f',
          700: '#b71c1c',
          900: '#7f1010',
        },
        lexo: {
          charcoal: '#09090b',
          black: '#18181b',
          dark: '#09090b',
          gray: '#52525b',
          light: '#f4f4f5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['Inter', 'var(--font-display)', 'system-ui', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        /* Neutral, soft shadows — premium feel, low spread.           */
        'glass': '0 4px 24px rgba(9, 9, 11, 0.06), 0 1px 2px rgba(9, 9, 11, 0.03)',
        'glass-strong': '0 12px 48px rgba(9, 9, 11, 0.12), 0 2px 8px rgba(9, 9, 11, 0.04)',
        'card': '0 1px 2px rgba(9, 9, 11, 0.04), 0 4px 16px rgba(9, 9, 11, 0.04)',
        'card-hover': '0 8px 32px rgba(9, 9, 11, 0.08), 0 2px 8px rgba(9, 9, 11, 0.04)',
        /* Red-tinted button glow to match primary.                    */
        'button': '0 8px 24px -8px rgba(211, 47, 47, 0.4), 0 2px 4px -2px rgba(211, 47, 47, 0.25)',
        'button-hover': '0 12px 32px -8px rgba(211, 47, 47, 0.55), 0 4px 8px -2px rgba(211, 47, 47, 0.3)',
        'nav': '0 -8px 32px rgba(9, 9, 11, 0.08)',
        'ring-primary': '0 0 0 4px rgba(211, 47, 47, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
