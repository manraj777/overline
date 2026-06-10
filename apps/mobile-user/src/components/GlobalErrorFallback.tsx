import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../theme';

export function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Log to Crashlytics automatically when this screen is shown
  React.useEffect(() => {
    crashlytics().recordError(error);
  }, [error]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <AlertTriangle size={48} color="#DC2626" />
        </View>
        
        <Text style={styles.title}>Oops! Something went wrong.</Text>
        <Text style={styles.message}>
          We've encountered an unexpected error. Our team has been notified and we're working on it.
        </Text>
        
        {/* Only show error details in dev or if needed, typically hidden in production */}
        {__DEV__ && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} numberOfLines={5}>
              {error.message}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.button} 
          onPress={resetErrorBoundary}
          activeOpacity={0.8}
        >
          <RefreshCcw size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.md,
  },
  errorBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    marginBottom: Spacing['2xl'],
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FontSizes.xs,
    color: '#DC2626',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
    ...Shadows.md,
    gap: Spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
});
