// Overline Design System - Theme & Constants
// Premium color palette inspired by modern fintech/booking apps

export const Colors = {
    // Primary brand colors (matching web Tailwind config)
    primary: '#0ea5e9', // primary-500
    primaryDark: '#0284c7', // primary-600
    primaryLight: '#bae6fd', // primary-200
    primaryGhost: 'rgba(14, 165, 233, 0.08)',
    primaryBorder: 'rgba(14, 165, 233, 0.2)',

    // Accent colors (matching web Tailwind config)
    accent: '#d946ef', // accent-500
    accentDark: '#c026d3', // accent-600
    accentLight: '#f5d0fe', // accent-200

    // Semantic colors
    success: '#10B981', // green-500
    successLight: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B', // yellow-500
    warningLight: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444', // red-500
    errorLight: 'rgba(239, 68, 68, 0.1)',
    info: '#3B82F6', // blue-500

    // Neutral palette (Lexo Light theme)
    background: '#F8F9FA', // lexo-light
    surface: '#FFFFFF',
    surfaceLight: '#F3F4F6', // gray-100
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardLight: '#F8F9FA',

    // Text (Lexo theme)
    textPrimary: '#18191F', // lexo-black
    textSecondary: '#282D3C', // lexo-charcoal
    textTertiary: '#8C92A4', // lexo-gray
    textMuted: '#9CA3AF', // gray-400

    // Borders
    border: 'rgba(0, 0, 0, 0.06)',
    borderLight: 'rgba(0, 0, 0, 0.03)',
    borderActive: 'rgba(14, 165, 233, 0.4)',

    // Gradients (start, end)
    gradientPrimary: ['#0ea5e9', '#d946ef'],
    gradientAccent: ['#d946ef', '#0ea5e9'],
    gradientSuccess: ['#10B981', '#38bdf8'],
    gradientSurface: ['#FFFFFF', '#F8F9FA'],
    gradientDark: ['#F8F9FA', '#FFFFFF'],

    // Overlays
    overlay: 'rgba(24, 25, 31, 0.6)', // lexo-black with opacity
    overlayLight: 'rgba(24, 25, 31, 0.2)',
    shimmer: 'rgba(0, 0, 0, 0.05)',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
};

export const FontSizes = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    hero: 48,
};

export const FontWeights = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
    },
    glow: {
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
};

export const StatusBarStyle = 'dark-content' as const;

// Booking status config
export const BookingStatusConfig: Record<string, { color: string; bg: string; icon: string }> = {
    PENDING: { color: '#FFB830', bg: 'rgba(255, 184, 48, 0.15)', icon: '⏳' },
    CONFIRMED: { color: '#00C48C', bg: 'rgba(0, 196, 140, 0.15)', icon: '✓' },
    IN_PROGRESS: { color: '#00D2FF', bg: 'rgba(0, 210, 255, 0.15)', icon: '▶' },
    COMPLETED: { color: '#00C48C', bg: 'rgba(0, 196, 140, 0.15)', icon: '✓' },
    CANCELLED: { color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.15)', icon: '✕' },
    NO_SHOW: { color: '#6E7191', bg: 'rgba(110, 113, 145, 0.15)', icon: '!' },
};
