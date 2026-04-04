// Overline Design System - Theme & Constants
// Premium color palette inspired by modern fintech/booking apps

export const Colors = {
    // M3 Tokens (Figma palette mapping)
    primary: '#4648d4',
    onPrimary: '#ffffff',
    primaryContainer: '#dfe0ff',
    onPrimaryContainer: '#00006e',
    
    secondary: '#5c5d72',
    onSecondary: '#ffffff',
    secondaryContainer: '#e1e0f9',
    onSecondaryContainer: '#191a2c',

    tertiary: '#795369',
    onTertiary: '#ffffff',
    tertiaryContainer: '#ffd8ec',
    onTertiaryContainer: '#2f1124',

    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#410002',

    background: '#f8f9ff',
    onBackground: '#191a20',
    surface: '#f8f9ff',
    onSurface: '#191a20',
    
    surfaceVariant: '#e3e1ec',
    onSurfaceVariant: '#46464f',
    outline: '#777680',
    outlineVariant: '#c7c5d0',

    // Retained for absolute compatibility with legacy Screens but forced to M3 equivalents
    primaryGhost: 'rgba(70, 72, 212, 0.1)',
    primaryBorder: 'rgba(70, 72, 212, 0.25)',
    primaryDark: '#00006e',
    primaryLight: '#dfe0ff',
    
    accent: '#5c5d72',
    accentDark: '#191a2c',
    accentLight: '#e1e0f9',
    
    success: '#006e44',
    successLight: 'rgba(0, 110, 68, 0.14)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.14)',
    errorLight: 'rgba(186, 26, 26, 0.14)',
    info: '#4648d4',
    
    surfaceLight: '#ffffff',
    surfaceElevated: '#ffffff',
    card: '#ffffff',
    cardLight: '#f8f9ff',

    textPrimary: '#191a20',
    textSecondary: '#46464f',
    textTertiary: '#777680',
    textMuted: '#c7c5d0',

    border: '#c7c5d0',
    borderLight: '#e3e1ec',
    borderActive: '#4648d4',

    gradientPrimary: ['#4648d4', '#5c5d72'],
    gradientAccent: ['#5c5d72', '#4648d4'],
    gradientSuccess: ['#006e44', '#34d399'],
    gradientSurface: ['#ffffff', '#f8f9ff'],
    gradientDark: ['#f8f9ff', '#ffffff'],

    overlay: 'rgba(25, 26, 32, 0.62)',
    overlayLight: 'rgba(25, 26, 32, 0.22)',
    shimmer: 'rgba(199, 197, 208, 0.35)',

    // Deprecated legacy tokens remapped to M3 equivalents for backward compatibility
    white: '#ffffff',
    black: '#000000',
    gray50: '#f8f9ff',
    gray100: '#f8f9ff',
    gray200: '#e3e1ec',
    gray400: '#c7c5d0',
    gray500: '#777680',
    gray600: '#46464f',
    gray800: '#191a20',
    gray900: '#191a20',

    primary50: '#dfe0ff',
    primary100: '#dfe0ff',
    primary200: '#dfe0ff',
    primary400: '#4648d4',
    primary500: '#4648d4',
    primary600: '#4648d4',
    primary700: '#00006e',

    accent100: '#e1e0f9',
    accent500: '#5c5d72',
    accent600: '#5c5d72',
    accent700: '#191a2c',

    success50: '#d1fae5',
    success500: '#006e44',
    success700: '#006e44',
    warning50: '#fef3c7',
    warning500: '#f59e0b',
    warning700: '#92400e',
    danger50: '#ffdad6',
    danger500: '#ba1a1a',
    danger700: '#ba1a1a',
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
    PENDING: { color: '#ba1a1a', bg: '#ffdad6', icon: '⏳' }, // Warning variant equivalent
    UPCOMING: { color: '#4648d4', bg: '#dfe0ff', icon: '⏳' },
    CONFIRMED: { color: '#006e44', bg: '#d1fae5', icon: '✓' },
    IN_PROGRESS: { color: '#5c5d72', bg: '#e1e0f9', icon: '▶' },
    IN_SERVICE: { color: '#5c5d72', bg: '#e1e0f9', icon: '▶' },
    COMPLETED: { color: '#46464f', bg: '#e3e1ec', icon: '✓' },
    CANCELLED: { color: '#ba1a1a', bg: '#ffdad6', icon: '✕' },
    NO_SHOW: { color: '#ba1a1a', bg: '#ffdad6', icon: '!' },
};
