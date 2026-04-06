export const Colors = {
  // M3 Tokens Mapping
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

  white: '#ffffff',

  // Convenience aliases to simplify incremental migration.
  primaryDark: '#00006e',
  border: '#c7c5d0',
  textPrimary: '#191a20',
  textSecondary: '#46464f',
  textMuted: '#777680',

  // Deprecated legacy tokens remapped to M3 equivalents for backward compatibility
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

  success50: '#d1fae5',
  success500: '#006e44',
  success700: '#006e44',
  warning50: '#fef3c7',
  warning500: '#f59e0b',
  warning700: '#92400e',
  danger50: '#ffdad6',
  danger500: '#ba1a1a',
  danger700: '#ba1a1a',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  caption: 11,
  label: 12,
  body: 14,
  h3: 16,
  h2: 20,
  h1: 24,
  display: 32,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  }
} as const;
