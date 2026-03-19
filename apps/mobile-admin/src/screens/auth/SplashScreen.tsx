import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';

export default function SplashScreen() {
  // checkAuth is handled by AppContent in App.tsx
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>Overline</Text>
        <Text style={styles.subtitle}>Admin</Text>
      </View>
      <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  loader: {
    marginTop: 20,
  },
});
