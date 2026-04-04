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
        /* ── Overline M3 Design System ── */
        primary: {
          DEFAULT: '#4648d4',
          container: '#6063ee',
          fixed: '#e1e0ff',
          'fixed-dim': '#c0c1ff',
        },
        secondary: {
          DEFAULT: '#6b38d4',
          container: '#8455ef',
          fixed: '#e9ddff',
          'fixed-dim': '#d0bcff',
        },
        tertiary: {
          DEFAULT: '#006c49',
          container: '#00885d',
          fixed: '#6ffbbe',
          'fixed-dim': '#4edea3',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#cbdbf5',
          bright: '#f8f9ff',
          variant: '#d3e4fe',
          container: {
            DEFAULT: '#e5eeff',
            low: '#eff4ff',
            high: '#dce9ff',
            highest: '#d3e4fe',
            lowest: '#ffffff',
          },
          tint: '#494bd6',
        },
        outline: {
          DEFAULT: '#767586',
          variant: '#c7c4d7',
        },
        inverse: {
          surface: '#213145',
          'on-surface': '#eaf1ff',
          primary: '#c0c1ff',
        },
        on: {
          surface: '#0b1c30',
          'surface-variant': '#464554',
          primary: '#ffffff',
          'primary-container': '#fffbff',
          secondary: '#ffffff',
          'secondary-container': '#fffbff',
          tertiary: '#ffffff',
          'tertiary-container': '#000703',
          error: '#ffffff',
          'error-container': '#93000a',
          background: '#0b1c30',
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
