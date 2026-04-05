import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import axios from 'axios';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {RootStackParamList} from '../../types';

const BRAND_LOGO = require('../../../assets/branding/overline-logo.png');
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [role, setRole] = useState<'OWNER' | 'STAFF'>('OWNER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const {login, loginWithGoogle, sendPhoneLoginOtp} = useAuthStore();

  React.useEffect(() => {
    GoogleSignin.configure({
      // Can be provided through native config; webClientId is optional but recommended for idToken.
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  }, []);

  const validate = () => {
    const newErrors: {email?: string; password?: string} = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Send the requested scope to the login handler (auth.service.ts will enforce it)
      await login(email, password, { requestedRole: role });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as {message?: string} | undefined)?.message || 'Invalid credentials')
        : error instanceof Error
          ? error.message
          : 'Invalid credentials';
      Alert.alert(
        'Login Failed',
        message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const normalizePhone = (rawPhone: string): string => {
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    return rawPhone.startsWith('+') ? rawPhone : `+${digits}`;
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const googleUser = await GoogleSignin.signIn();
      const idToken = googleUser.data?.idToken;

      if (!idToken) {
        throw new Error('Google did not return an ID token. Please retry.');
      }

      await loginWithGoogle(idToken, {requestedRole: 'OWNER'});
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as {message?: string} | undefined)?.message || 'Google login failed')
        : error instanceof Error
          ? error.message
          : 'Google login failed';
      Alert.alert('Google Sign-In Failed', message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(normalized)) {
      Alert.alert('Invalid Phone', 'Enter a valid phone number including country code or 10-digit Indian mobile.');
      return;
    }

    setIsPhoneLoading(true);
    try {
      await sendPhoneLoginOtp(normalized);
      navigation.navigate('OtpVerify', {
        phone: normalized,
        flow: 'PHONE_LOGIN',
        requestedRole: 'OWNER',
      });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as {message?: string} | undefined)?.message || 'Unable to send OTP')
        : error instanceof Error
          ? error.message
          : 'Unable to send OTP';
      Alert.alert('OTP Failed', message);
    } finally {
      setIsPhoneLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={BRAND_LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.subtitle}>{role === 'OWNER' ? 'Shop Owner Login' : 'Staff Login'}</Text>
          <Text style={styles.description}>
            {role === 'OWNER' ? 'Continue with Google or phone OTP' : 'Sign in with email and password'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {role === 'OWNER' ? (
            <>
              <TouchableOpacity
                style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={isGoogleLoading}
                activeOpacity={0.85}>
                {isGoogleLoading ? (
                  <ActivityIndicator color={Colors.textPrimary} />
                ) : (
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.orText}>or</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={Colors.outline}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isPhoneLoading && styles.buttonDisabled]}
                onPress={handleSendPhoneOtp}
                disabled={isPhoneLoading}
                activeOpacity={0.8}>
                {isPhoneLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setRole('STAFF')} style={styles.roleLinkWrap}>
                <Text style={styles.roleLinkText}>Staff? Login with email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.outline}
                  secureTextEntry
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setRole('OWNER')} style={styles.roleLinkWrap}>
                <Text style={styles.roleLinkText}>Back to owner login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Protected by Overline internal policies
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxxxl,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: Spacing.xxl,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  orText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeight.medium,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.label,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.caption,
    marginTop: 4,
    fontWeight: FontWeight.medium,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roleLinkWrap: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  roleLinkText: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.caption,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
});
