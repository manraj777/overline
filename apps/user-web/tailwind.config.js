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
          DEFAULT: '#BE185D',
          50: '#FDF2F8',
          100: '#FBD5E5',
          200: '#F9A8D4',
          300: '#F472B6',
          400: '#EC4899',
          500: '#DB2777',
          600: '#BE185D',
          700: '#9D174D',
          800: '#831843',
          900: '#500724',
          950: '#2E0515',
          container: '#9D174D',
          fixed: '#FBD5E5',
          'fixed-dim': '#F9A8D4',
        },
        secondary: {
          DEFAULT: '#1F2937',
          container: '#111827',
          fixed: '#E5E7EB',
          'fixed-dim': '#D1D5DB',
        },
        tertiary: {
          DEFAULT: '#059669',
          container: '#047857',
          fixed: '#A7F3D0',
          'fixed-dim': '#6EE7B7',
        },
        error: {
          DEFAULT: '#DC2626',
          container: '#7F1D1D',
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        success: {
          DEFAULT: '#059669',
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          DEFAULT: '#D97706',
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
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
          primary: '#FBD5E5',
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
          'error-container': '#FCA5A5',
          background: 'var(--ovl-on-surface)',
        },
        background: 'var(--ovl-bg)',
        /* ── Legacy tokens kept for gradual migration ── */
        brand: {
          100: '#FBD5E5',
          300: '#F9A8D4',
          500: '#BE185D',
          700: '#9D174D',
          900: '#500724',
        },
        lexo: {
          charcoal: '#111827',
          black: '#1F2937',
          dark: '#111827',
          gray: '#4B5563',
          light: '#F9FAFB',
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
        /* Neutral, soft shadows — premium feel, low spread. */
        'glass': '0 4px 24px rgba(17, 24, 39, 0.06), 0 1px 2px rgba(17, 24, 39, 0.03)',
        'glass-strong': '0 12px 48px rgba(17, 24, 39, 0.12), 0 2px 8px rgba(17, 24, 39, 0.04)',
        'card': '0 1px 2px rgba(17, 24, 39, 0.04), 0 4px 16px rgba(17, 24, 39, 0.04)',
        'card-hover': '0 8px 32px rgba(17, 24, 39, 0.08), 0 2px 8px rgba(17, 24, 39, 0.04)',
        /* Rose-tinted button glow to match new primary. */
        'button': '0 8px 24px -8px rgba(190, 24, 93, 0.35), 0 2px 4px -2px rgba(190, 24, 93, 0.2)',
        'button-hover': '0 12px 32px -8px rgba(190, 24, 93, 0.5), 0 4px 8px -2px rgba(190, 24, 93, 0.25)',
        'nav': '0 -8px 32px rgba(17, 24, 39, 0.08)',
        'ring-primary': '0 0 0 4px rgba(190, 24, 93, 0.12)',
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
