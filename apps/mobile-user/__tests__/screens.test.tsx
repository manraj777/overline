/**
 * Screen Tests - Verify all screens render without crashing
 * Tests cover: Auth, Home, Booking, Wallet, Profile flows
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mock native modules
jest.mock('react-native-permissions', () => ({
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: { IOS: { LOCATION_WHEN_IN_USE: 'ios.location', CAMERA: 'ios.camera' }, ANDROID: {} },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' },
  requestNotifications: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ data: { idToken: 'test' } })),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
}));

jest.mock('@react-native-firebase/app', () => ({ firebase: { app: jest.fn() } }));
jest.mock('@react-native-firebase/auth', () => () => ({ signInWithCredential: jest.fn() }));
jest.mock('@react-native-firebase/database', () => () => ({ ref: jest.fn() }));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) => React.createElement('View', props, children),
    SafeAreaProvider: ({ children }: any) => React.createElement('View', null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() }),
  useRoute: () => ({ params: { shopId: 'test-shop', phone: '+1234567890', bookingId: 'test-booking', selectedServices: ['svc1'] } }),
  NavigationContainer: ({ children }: any) => children,
  DefaultTheme: { dark: false, colors: { primary: '#000', background: '#fff', card: '#fff', text: '#000', border: '#ccc', notification: '#000' } },
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: true, refetch: jest.fn(), isRefetching: false }),
  useMutation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn(), setQueryData: jest.fn() }),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  ScrollView: require('react-native').ScrollView,
}));

// Helper: wrap in act for async state updates
const { act } = ReactTestRenderer;

// ─── Screen Render Tests ───────
// Some screens render null without auth state or query data - that's expected.
// We verify no component throws during render.

const screenTests = [
  { name: 'SplashScreen', path: '../src/screens/auth/SplashScreen' },
  { name: 'OnboardingScreen', path: '../src/screens/auth/OnboardingScreen' },
  { name: 'LoginScreen', path: '../src/screens/auth/LoginScreen' },
  { name: 'RegisterScreen', path: '../src/screens/auth/RegisterScreen' },
  { name: 'OtpVerifyScreen', path: '../src/screens/auth/OtpVerifyScreen' },
  { name: 'HomeScreen', path: '../src/screens/home/HomeScreen' },
  { name: 'ShopDetailScreen', path: '../src/screens/home/ShopDetailScreen' },
  { name: 'BookingScreen', path: '../src/screens/booking/BookingScreen' },
  { name: 'MyBookingsScreen', path: '../src/screens/booking/MyBookingsScreen' },
  { name: 'BookingConfirmationScreen', path: '../src/screens/booking/BookingConfirmationScreen' },
  { name: 'BookingDetailScreen', path: '../src/screens/booking/BookingDetailScreen' },
  { name: 'WalletScreen', path: '../src/screens/wallet/WalletScreen' },
  { name: 'ProfileScreen', path: '../src/screens/profile/ProfileScreen' },
];

describe.each(screenTests)('$name', ({ name, path }) => {
  it('renders without throwing', () => {
    const Screen = require(path).default;
    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(<Screen />);
    });
    // Component should not throw - null render is acceptable for guarded screens
    expect(tree).toBeTruthy();
  });
});

// ─── Test: PermissionManager ───────
describe('PermissionManager', () => {
  it('exports all required permission methods', () => {
    const { PermissionManager } = require('../src/utils/PermissionManager');
    expect(typeof PermissionManager.requestLocationPermission).toBe('function');
    expect(typeof PermissionManager.requestCameraPermission).toBe('function');
    expect(typeof PermissionManager.requestNotificationPermission).toBe('function');
    expect(typeof PermissionManager.requestAllRequiredPermissions).toBe('function');
  });
});

// ─── Test: API Client ───────
describe('API Client', () => {
  it('exports all required API modules', () => {
    const client = require('../src/api/client');
    expect(client.shopsApi).toBeDefined();
    expect(client.bookingsApi).toBeDefined();
    expect(client.walletApi).toBeDefined();
    expect(client.otpApi).toBeDefined();
    expect(client.authApi).toBeDefined();
    expect(client.paymentsApi).toBeDefined();
  });

  it('shopsApi has required methods', () => {
    const { shopsApi } = require('../src/api/client');
    expect(typeof shopsApi.list).toBe('function');
    expect(typeof shopsApi.getBySlug).toBe('function');
    expect(typeof shopsApi.getServices).toBe('function');
    expect(typeof shopsApi.getQueue).toBe('function');
  });

  it('bookingsApi has required methods', () => {
    const { bookingsApi } = require('../src/api/client');
    expect(typeof bookingsApi.create).toBe('function');
    expect(typeof bookingsApi.getMy).toBe('function');
    expect(typeof bookingsApi.getById).toBe('function');
    expect(typeof bookingsApi.cancel).toBe('function');
  });

  it('otpApi has required methods', () => {
    const { otpApi } = require('../src/api/client');
    expect(typeof otpApi.send).toBe('function');
    expect(typeof otpApi.verify).toBe('function');
    expect(typeof otpApi.login).toBe('function');
  });

  it('walletApi has required methods', () => {
    const { walletApi } = require('../src/api/client');
    expect(typeof walletApi.get).toBe('function');
  });
});

// ─── Test: Auth Store ───────
describe('Auth Store', () => {
  it('exports useAuthStore', () => {
    const { useAuthStore } = require('../src/stores/authStore');
    expect(useAuthStore).toBeDefined();
    expect(typeof useAuthStore).toBe('function');
  });
});

// ─── Test: Config ───────
describe('Config', () => {
  it('has correct production API URL', () => {
    const { Config } = require('../src/config/env');
    expect(Config.API_BASE_URL).toBeDefined();
    expect(typeof Config.API_BASE_URL).toBe('string');
  });

  it('has Google auth config', () => {
    const { Config } = require('../src/config/env');
    expect(Config.GOOGLE).toBeDefined();
    expect(Config.GOOGLE.WEB_CLIENT_ID).toBeDefined();
  });

  it('has OTP config', () => {
    const { Config } = require('../src/config/env');
    expect(Config.OTP.LENGTH).toBe(6);
    expect(Config.OTP.RESEND_COOLDOWN_SECONDS).toBe(60);
  });

  it('has feature flags', () => {
    const { Config } = require('../src/config/env');
    expect(Config.FEATURES.OTP_AUTH_ENABLED).toBe(true);
    expect(Config.FEATURES.GOOGLE_AUTH_ENABLED).toBe(true);
    expect(Config.FEATURES.WALLET_ENABLED).toBe(true);
  });
});

// ─── Test: Theme ───────
describe('Theme', () => {
  it('exports required theme constants', () => {
    const theme = require('../src/theme');
    expect(theme.Colors).toBeDefined();
    expect(theme.Spacing).toBeDefined();
    expect(theme.FontSizes).toBeDefined();
    expect(theme.BorderRadius).toBeDefined();
  });
});

// ─── Test: Types ───────
describe('Types', () => {
  it('exports type definitions without errors', () => {
    const types = require('../src/types');
    expect(types).toBeDefined();
  });
});
