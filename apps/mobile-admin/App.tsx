/**
 * Overline Admin App
 * React Native mobile app for shop owners to manage bookings
 */

import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import {useAuthStore} from './src/stores/authStore';
import {useSocket} from './src/hooks/useSocket';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function AppContent() {
  const {checkAuth} = useAuthStore();

  useSocket(); // Maintain global real-time connection for shop alerts

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <RootNavigator />;
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
