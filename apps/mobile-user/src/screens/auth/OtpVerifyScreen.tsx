import React, { useState, useRef, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSizes,
  FontWeights,
  Shadows,
} from '../../theme';
import { otpApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OtpVerify'>;
type RouteProps = RouteProp<RootStackParamList, 'OtpVerify'>;

const OTP_LENGTH = 6;

export default function OtpVerifyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { phone } = route.params;
  const { completeOtpLogin } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    setError('');
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste - distribute digits across inputs
      const digits = value.replace(/\D/g, '').split('');
      for (let i = 0; i < OTP_LENGTH && i < digits.length; i++) {
        newOtp[i] = digits[i];
      }
      setOtp(newOtp);
      const lastFilledIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();

      // Auto-verify if all fields filled
      if (digits.length >= OTP_LENGTH) {
        verifyOtp(newOtp.join(''));
      }
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        verifyOtp(fullOtp);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const verifyOtp = async (code: string) => {
    setIsVerifying(true);
    setError('');

    try {
      // Single-step: loginWithOtp verifies OTP and returns JWT tokens
      const { data } = await otpApi.login(phone, code);

      // Store tokens and update auth state via store
      await completeOtpLogin(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(message);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      await otpApi.send(phone, 'LOGIN');
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      Alert.alert('OTP Sent', `A new code has been sent to ${formatPhone(phone)}`);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to resend OTP',
      );
    } finally {
      setIsResending(false);
    }
  };

  const formatPhone = (p: string) => {
    if (p.startsWith('+91')) {
      return `+91 ${p.slice(3, 8)} ${p.slice(8)}`;
    }
    return p;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{'🔐'}</Text>
          </View>
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneHighlight}>{formatPhone(phone)}</Text>
          </Text>
        </View>

        {/* OTP Inputs */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Loading */}
        {isVerifying && (
          <View style={styles.verifyingContainer}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.verifyingText}>Verifying...</Text>
          </View>
        )}

        {/* Resend */}
        <View style={styles.resendContainer}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>
              Resend code in{' '}
              <Text style={styles.countdownNumber}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={isResending}>
              {isResending ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.resendText}>Resend Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Security note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>{'🛡️'}</Text>
          <Text style={styles.securityText}>
            Your verification code expires in 10 minutes. Never share this code
            with anyone.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 210, 255, 0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: height * 0.06,
  },
  backButton: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  backText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneHighlight: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: Spacing['2xl'],
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    textAlign: 'center',
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  otpInputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  errorContainer: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  verifyingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  countdownText: {
    color: Colors.textTertiary,
    fontSize: FontSizes.md,
  },
  countdownNumber: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  securityIcon: {
    fontSize: 18,
  },
  securityText: {
    flex: 1,
    color: Colors.textTertiary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
