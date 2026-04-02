/**
 * Mobile App Environment Configuration
 * 
 * This file contains all environment-specific configuration for the mobile app.
 * In production, these values should be set during the build process using
 * react-native-config or similar environment variable management.
 */

import { Platform } from 'react-native';

// Determine if we're in development mode
const isDev = __DEV__;

// Backend URL configuration
// For local dev on device: set DEV_HOST to your computer's LAN IP
// For emulators/simulators: defaults to 10.0.2.2 (Android) or localhost (iOS)
// For production: the Railway URL is used automatically
const DEV_HOST =
  process.env.DEV_HOST ||
  (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const PROD_URL = 'https://overlinebackend-production.up.railway.app';

const API_BASE = __DEV__
  ? `http://${DEV_HOST}:3001/api/v1`
  : `${PROD_URL}/api/v1`;
const WS_BASE = __DEV__
  ? `ws://${DEV_HOST}:3001`
  : PROD_URL.replace('https://', 'wss://');

// Configuration object
export const Config = {
  // API Configuration
  API_BASE_URL: API_BASE,
  
  // WebSocket Configuration (for real-time features)
  WS_URL: WS_BASE,

  // App Version
  APP_VERSION: '1.0.0',
  
  // Feature Flags
  FEATURES: {
    OTP_AUTH_ENABLED: true,
    EMAIL_AUTH_ENABLED: false, // Disabled - OTP is primary auth method
    GOOGLE_AUTH_ENABLED: true, // Enabled - Google OAuth
    PAYMENTS_ENABLED: true,
    BOOKING_ONLINE_ONLY: true, // Mandatory online payment flow for APK demo
    WALLET_ENABLED: true,
  },

  // Google Sign-In Configuration
  // Get this from https://console.cloud.google.com/ > APIs & Services > Credentials
  // Create OAuth 2.0 Client IDs for Web application (used by React Native)
  GOOGLE: {
    // Web Client ID - required for Android Google Sign-In
    WEB_CLIENT_ID: '409423359805-5istogdcdj476ff3816m28g7qkc622bc.apps.googleusercontent.com', // TODO: Add your Google Web Client ID here
    // Set to true to enable offline access (refresh tokens)
    OFFLINE_ACCESS: true,
  },

  // OTP Configuration
  OTP: {
    LENGTH: 6,
    RESEND_COOLDOWN_SECONDS: 60,
    EXPIRY_MINUTES: 10,
  },

  // Request timeouts
  TIMEOUTS: {
    API_REQUEST: 15000,
    UPLOAD: 60000,
  },

  // Debug settings
  DEBUG: {
    LOG_API_CALLS: isDev,
    LOG_NAVIGATION: isDev,
    SHOW_DEV_MENU: isDev,
  },
};

// Helper function to get physical device URL
// Users can call this to get the correct URL for their local network
export const getLocalNetworkUrl = (localIp: string, port: number = 3001) => {
  return `http://${localIp}:${port}/api/v1`;
};

// Export individual values for convenience
export const {
  API_BASE_URL,
  WS_URL,
  APP_VERSION,
  FEATURES,
  GOOGLE,
  OTP,
  TIMEOUTS,
  DEBUG,
} = Config;

export default Config;
