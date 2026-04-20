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
        /* ── Overline M3 Design System ── */
        primary: {
          DEFAULT: '#d32f2f',
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
        },
        surface: {
          DEFAULT: '#09090b',
          dim: '#18181b',
          bright: '#27272a',
          variant: '#1f2937',
          container: {
            DEFAULT: '#18181b',
            low: '#000000',
            high: '#27272a',
            highest: '#3f3f46',
            lowest: '#09090b',
          },
          tint: '#d32f2f',
        },
        outline: {
          DEFAULT: '#52525b',
          variant: '#3f3f46',
        },
        inverse: {
          surface: '#f4f4f5',
          'on-surface': '#09090b',
          primary: '#ffcdd2',
        },
        on: {
          surface: '#f4f4f5',
          'surface-variant': '#a1a1aa',
          primary: '#ffffff',
          'primary-container': '#ffffff',
          secondary: '#ffffff',
          'secondary-container': '#ffffff',
          tertiary: '#ffffff',
          'tertiary-container': '#ffffff',
          error: '#ffffff',
          'error-container': '#fca5a5',
          background: '#f4f4f5',
        },
        background: '#f8f9ff',
        /* ── Legacy compatibility ── */
        brand: {
          100: '#e1e0ff',
          300: '#c0c1ff',
          500: '#4648d4',
          700: '#2f2ebe',
          900: '#07006c',
        },
        lexo: {
          charcoal: '#0b1c30',
          black: '#213145',
          dark: '#0b1c30',
          gray: '#767586',
          light: '#f8f9ff',
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
        'glass': '0 4px 20px rgba(99, 102, 241, 0.08)',
        'glass-strong': '0 8px 32px rgba(99, 102, 241, 0.15)',
        'card': '0 4px 16px rgba(70, 72, 212, 0.06)',
        'card-hover': '0 8px 32px rgba(70, 72, 212, 0.12)',
        'button': '0 4px 16px rgba(70, 72, 212, 0.2)',
        'button-hover': '0 6px 24px rgba(70, 72, 212, 0.3)',
        'nav': '0 -4px 24px rgba(99, 102, 241, 0.12)',
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
