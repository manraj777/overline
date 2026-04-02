// Overline Design System - Theme & Constants
// Premium color palette inspired by modern fintech/booking apps

export const Colors = {
    // Figma palette: primary
    primary50: '#f0f4ff',
    primary100: '#e0e7ff',
    primary200: '#c7d2fe',
    primary400: '#818cf8',
    primary500: '#6366f1',
    primary600: '#4f46e5',
    primary700: '#4338ca',

    // Figma palette: accent
    accent100: '#ede9fe',
    accent500: '#8b5cf6',
    accent600: '#7c3aed',
    accent700: '#6d28d9',

    // Figma palette: semantic
    success50: '#d1fae5',
    success500: '#10b981',
    success700: '#065f46',
    warning50: '#fef3c7',
    warning500: '#f59e0b',
    warning700: '#92400e',
    danger50: '#fee2e2',
    danger500: '#ef4444',
    danger700: '#b91c1c',

    // Figma palette: neutral
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray800: '#1f2937',
    gray900: '#111827',
    black: '#000000',

    // Backward compatible aliases used in current screens/components
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#c7d2fe',
    primaryGhost: 'rgba(99, 102, 241, 0.1)',
    primaryBorder: 'rgba(99, 102, 241, 0.25)',
    accent: '#8b5cf6',
    accentDark: '#7c3aed',
    accentLight: '#ede9fe',
    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.14)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.14)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.14)',
    info: '#6366f1',

    background: '#f9fafb',
    surface: '#ffffff',
    surfaceLight: '#f3f4f6',
    surfaceElevated: '#ffffff',
    card: '#ffffff',
    cardLight: '#f9fafb',

    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textTertiary: '#6b7280',
    textMuted: '#9ca3af',

    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    borderActive: 'rgba(99, 102, 241, 0.45)',

    gradientPrimary: ['#6366f1', '#8b5cf6'],
    gradientAccent: ['#8b5cf6', '#6366f1'],
    gradientSuccess: ['#10b981', '#34d399'],
    gradientSurface: ['#ffffff', '#f9fafb'],
    gradientDark: ['#f9fafb', '#ffffff'],

    overlay: 'rgba(17, 24, 39, 0.62)',
    overlayLight: 'rgba(17, 24, 39, 0.22)',
    shimmer: 'rgba(156, 163, 175, 0.35)',
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
    sm: 12,
    md: 14,
    lg: 16,
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
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
    glow: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
};

export const StatusBarStyle = 'dark-content' as const;

// Booking status config
export const BookingStatusConfig: Record<string, { color: string; bg: string; icon: string }> = {
    PENDING: { color: '#92400e', bg: '#fef3c7', icon: '⏳' },
    UPCOMING: { color: '#4338ca', bg: '#e0e7ff', icon: '⏳' },
    CONFIRMED: { color: '#065f46', bg: '#d1fae5', icon: '✓' },
    IN_PROGRESS: { color: '#7c3aed', bg: '#ede9fe', icon: '▶' },
    IN_SERVICE: { color: '#7c3aed', bg: '#ede9fe', icon: '▶' },
    COMPLETED: { color: '#4b5563', bg: '#f3f4f6', icon: '✓' },
    CANCELLED: { color: '#b91c1c', bg: '#fee2e2', icon: '✕' },
    NO_SHOW: { color: '#92400e', bg: '#fef3c7', icon: '!' },
};
