import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator, Image} from 'react-native';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const BRAND_LOGO = require('../../../assets/branding/overline-logo.png');

export default function SplashScreen() {
  // checkAuth is handled by AppContent in App.tsx
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={BRAND_LOGO} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.subtitle}>Admin</Text>
      </View>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxxl,
  },
  logoImage: {
    width: 190,
    height: 190,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.h3,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  loader: {
    marginTop: Spacing.xl,
  },
});
