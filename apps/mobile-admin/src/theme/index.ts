export const Colors = {
  primary50: '#f0f4ff',
  primary100: '#e0e7ff',
  primary200: '#c7d2fe',
  primary400: '#818cf8',
  primary500: '#6366f1',
  primary600: '#4f46e5',
  primary700: '#4338ca',

  accent100: '#ede9fe',
  accent500: '#8b5cf6',
  accent600: '#7c3aed',

  success50: '#d1fae5',
  success500: '#10b981',
  success700: '#065f46',
  warning50: '#fef3c7',
  warning500: '#f59e0b',
  warning700: '#92400e',
  danger50: '#fee2e2',
  danger500: '#ef4444',
  danger700: '#b91c1c',

  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray800: '#1f2937',
  gray900: '#111827',

  // Convenience aliases to simplify incremental migration.
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  background: '#f9fafb',
  surface: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
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
