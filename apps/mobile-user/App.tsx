/**
 * Overline User App
 * React Native mobile app for booking appointments
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useSocket } from './src/hooks/useSocket';
import { ErrorBoundary } from 'react-error-boundary';
import { GlobalErrorFallback } from './src/components/GlobalErrorFallback';

import messaging from '@react-native-firebase/messaging';
import { userApi } from './src/api/client';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    },
  },
});

function AppContent() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useSocket(); // Maintain global real-time connection

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    async function setupPushNotifications() {
      if (!isAuthenticated) return;

      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const token = await messaging().getToken();
          console.log('[FCM] Token:', token);
          
          try {
            await userApi.updateFcmToken(token);
            console.log('[FCM] Token synced with backend');
          } catch (e) {
            console.error('[FCM] Failed to sync token with backend', e);
          }
        }
      } catch (e) {
        console.error('[FCM] Error setting up notifications', e);
      }
    }

    setupPushNotifications();

    // Foreground message handler
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] A new FCM message arrived!', JSON.stringify(remoteMessage));
      // Could show a local toast/notification here if needed
    });

    return unsubscribe;
  }, [isAuthenticated]);

  return <RootNavigator />;
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D0F" translucent={false} />
        <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
          <AppContent />
        </ErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
