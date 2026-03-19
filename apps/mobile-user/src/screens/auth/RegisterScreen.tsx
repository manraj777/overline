import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { InputField, PrimaryButton } from '../../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    // Normalize phone to +91 format
    const cleaned = phone.trim().replace(/\s+/g, '').replace(/^0+/, '');
    const normalizedPhone = cleaned.startsWith('+91')
      ? cleaned
      : cleaned.startsWith('91') && cleaned.length > 10
      ? `+${cleaned}`
      : `+91${cleaned}`;

    setIsSendingOtp(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, phone: normalizedPhone });
    } catch {
      // Error handled in store
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Create{'\n'}account</Text>
            <Text style={styles.welcomeSubtitle}>
              Join thousands getting appointments effortlessly
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <TouchableOpacity
                style={styles.errorContainer}
                onPress={clearError}
                activeOpacity={0.8}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.dismissError}>✕</Text>
              </TouchableOpacity>
            )}

            <InputField
              label="Full Name"
              icon="👤"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <InputField
              label="Email"
              icon="✉️"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="Phone"
              icon="📱"
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View>
              <InputField
                label="Password"
                icon="🔑"
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Text style={{ fontSize: 18 }}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

            <PrimaryButton
              title={isSendingOtp ? 'Creating Account...' : 'Create Account'}
              onPress={handleRegister}
              loading={isLoading || isSendingOtp}
              icon="✦"
              style={{ marginTop: Spacing.lg }}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-Up */}
            <TouchableOpacity style={styles.googleButton}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Sign up with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgOrb1: {
    position: 'absolute',
    top: -60,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 210, 255, 0.06)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: 80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(108, 92, 231, 0.06)',
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing['2xl'],
    paddingTop: height * 0.06,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['2xl'],
  },
  backArrow: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  welcomeSection: {
    marginBottom: Spacing['3xl'],
  },
  welcomeTitle: {
    fontSize: FontSizes['4xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    lineHeight: 44,
    marginBottom: Spacing.md,
  },
  welcomeSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  errorContainer: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontSize: FontSizes.sm,
  },
  dismissError: {
    color: Colors.error,
    fontWeight: FontWeights.bold,
    paddingLeft: Spacing.sm,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 42,
  },
  termsText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    lineHeight: 20,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing['2xl'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  googleText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: Spacing['4xl'],
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.md,
  },
});

