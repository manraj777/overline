import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { InputField, PrimaryButton } from '../../components/ui';
import { Config } from '../../config';
import { Smartphone, Lock, Shield, Mail, Key, Eye, EyeOff, ArrowRight, AlertTriangle, X } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
const BRAND_LOGO = require('../../../assets/branding/overline-logo.png');

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, googleLogin, sendOtp, isLoading, error, clearError } = useAuthStore();

  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Configure Google Sign-In on mount
  useEffect(() => {
    if (Config.FEATURES.GOOGLE_AUTH_ENABLED && Config.GOOGLE?.WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: Config.GOOGLE.WEB_CLIENT_ID,
        offlineAccess: Config.GOOGLE.OFFLINE_ACCESS,
      });
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (!Config.GOOGLE?.WEB_CLIENT_ID) {
      Alert.alert('Configuration Error', 'Google Sign-In is not configured. Please contact support.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();

      // Get the ID token
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Send ID token to backend
      await googleLogin(idToken);
    } catch (signInError: any) {
      if (signInError.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (signInError.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please Wait', 'Sign in already in progress');
      } else if (signInError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services is not available');
      } else {
        Alert.alert('Error', signInError.message || 'Google sign-in failed');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch {
      // Error handled in store
    }
  };

  const handlePhoneLogin = async () => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^0+/, '');
    if (cleaned.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Normalize to +91 format
    const normalized = cleaned.startsWith('+91')
      ? cleaned
      : cleaned.startsWith('91') && cleaned.length > 10
        ? `+${cleaned}`
        : `+91${cleaned}`;

    setIsSendingOtp(true);
    try {
      await sendOtp(normalized);
      navigation.navigate('OtpVerify', { phone: normalized });
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

          {/* Brand Header */}
          <View style={styles.header}>
            <Image source={BRAND_LOGO} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.tagline}>Book. Arrive. Shine.</Text>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in and continue where you left off
            </Text>
          </View>

          {/* Login Mode Toggle - only show if both methods are enabled */}
          {Config.FEATURES.EMAIL_AUTH_ENABLED && Config.FEATURES.OTP_AUTH_ENABLED && (
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, loginMode === 'phone' && styles.modeButtonActive]}
                onPress={() => { setLoginMode('phone'); clearError(); }}>
                <Text style={[styles.modeText, loginMode === 'phone' && styles.modeTextActive]}>
                  Phone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, loginMode === 'email' && styles.modeButtonActive]}
                onPress={() => { setLoginMode('email'); clearError(); }}>
                <Text style={[styles.modeText, loginMode === 'email' && styles.modeTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <TouchableOpacity
                style={styles.errorContainer}
                onPress={clearError}
                activeOpacity={0.8}>
                <AlertTriangle color={Colors.error} size={20} style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
                <X color={Colors.textTertiary} size={20} />
              </TouchableOpacity>
            )}

            {loginMode === 'phone' ? (
              <>
                <InputField
                  label="Phone Number"
                  icon={<Smartphone color={Colors.textSecondary} size={20} />}
                  placeholder="98765 43210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={13}
                />

                <PrimaryButton
                  title={isSendingOtp ? 'Sending code...' : 'Continue'}
                  onPress={handlePhoneLogin}
                  loading={isSendingOtp}
                  icon={<Lock color="#fff" size={20} />}
                  style={{ marginTop: Spacing.md }}
                />

                <View style={styles.otpInfoBox}>
                  <Shield color={Colors.primary} size={24} style={{ marginRight: 12, marginTop: 2 }} />
                  <Text style={styles.otpInfoText}>
                    We'll send a 6-digit verification code to your phone number for secure login
                  </Text>
                </View>
              </>
            ) : (
              <>
                <InputField
                  label="Email"
                  icon={<Mail color={Colors.textSecondary} size={20} />}
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View>
                  <InputField
                    label="Password"
                    icon={<Key color={Colors.textSecondary} size={20} />}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff color={Colors.textSecondary} size={20} /> : <Eye color={Colors.textSecondary} size={20} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.forgotButton}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <PrimaryButton
                  title="Sign In"
                  onPress={handleEmailLogin}
                  loading={isLoading}
                  icon={<ArrowRight color="#fff" size={20} />}
                  style={{ marginTop: Spacing.md }}
                />
              </>
            )}

            {/* Social login - only show if Google auth is enabled */}
            {Config.FEATURES.GOOGLE_AUTH_ENABLED && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={[styles.socialButton, isGoogleLoading && styles.socialButtonDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text style={styles.socialIcon}>G</Text>
                        <Text style={styles.socialText}>Google</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Overline? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Create Account</Text>
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
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 140, 66, 0.12)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -120,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(84, 28, 191, 0.08)',
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing['2xl'],
    paddingTop: height * 0.08,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoImage: {
    width: 170,
    height: 170,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
    ...Shadows.glow,
  },
  logoText: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  welcomeSection: {
    marginBottom: Spacing['3xl'],
  },
  welcomeTitle: {
    fontSize: FontSizes['4xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    lineHeight: 48,
    marginBottom: Spacing.md,
  },
  welcomeSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing['3xl'],
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
  errorIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
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
  eyeText: {
    fontSize: 18,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
    marginTop: -Spacing.md,
  },
  forgotText: {
    fontSize: FontSizes.sm,
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
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    flex: 1,
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
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  socialText: {
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing['2xl'],
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  modeText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textTertiary,
  },
  modeTextActive: {
    color: '#fff',
  },
  otpInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  otpInfoIcon: {
    fontSize: 18,
  },
  otpInfoText: {
    flex: 1,
    color: Colors.textTertiary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
