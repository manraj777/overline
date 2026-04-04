import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { RootStackParamList } from '../../types';
import { PrimaryButton } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegisterOtp'>;
type RouteProps = RouteProp<RootStackParamList, 'RegisterOtp'>;

const OTP_LENGTH = 6;

export default function RegisterOtpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { name, email, password, phone } = route.params;
  const { verifyOtpSession, sendOtp } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(120);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mm = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const ss = (seconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleChange = (value: string, index: number) => {
    const next = [...otp];
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      digits.forEach((digit, i) => {
        next[i] = digit;
      });
      setOtp(next);
      if (digits.length === OTP_LENGTH) {
        onVerify(next.join(''));
      }
      return;
    }

    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const onVerify = async (code?: string) => {
    const value = code || otp.join('');
    if (value.length < OTP_LENGTH) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      await verifyOtpSession(value);
      navigation.navigate('RegisterProfile', { name, email, password, phone });
    } catch {
      setError('Invalid OTP. Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const onResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    setError('');
    try {
      await sendOtp(phone);
      setCountdown(120);
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={Colors.primary600} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
        <View style={styles.lockBubble}>
          <Lock color={Colors.primary600} size={16} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Check your phone</Text>
        <Text style={styles.subtitle}>
          We have sent a 6-digit verification code to{' '}
          <Text style={styles.highlight}>{phone}</Text>.
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={value => handleChange(value, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              style={styles.otpInput}
              textAlign="center"
              autoFocus={index === 0}
            />
          ))}
        </View>

        <View style={styles.timerBubble}>
          <Text style={styles.timerText}>{formatTime(countdown)}</Text>
        </View>

        <Text style={styles.resendCopy}>
          Did not receive the code?{' '}
          <Text style={styles.resendLink} onPress={onResend}>
            {isResending ? 'Sending...' : 'Resend Code'}
          </Text>
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          title={isVerifying ? 'Verifying...' : 'Verify & Continue'}
          onPress={() => onVerify()}
          loading={isVerifying}
          style={styles.verifyBtn}
        />
      </View>

      <Text style={styles.footerSecurity}>Secure bank-level encryption</Text>
      {isVerifying && <ActivityIndicator size="small" color={Colors.primary600} style={{ marginBottom: 10 }} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f3fb',
    paddingTop: 54,
    paddingHorizontal: Spacing['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  headerTitle: {
    flex: 1,
    marginLeft: Spacing.lg,
    color: Colors.primary600,
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
  },
  lockBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary100,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 56,
    lineHeight: 56,
    color: Colors.textPrimary,
    fontWeight: FontWeights.extrabold,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSizes['2xl'],
    lineHeight: 34,
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
  },
  highlight: {
    color: Colors.primary600,
    fontWeight: FontWeights.bold,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing['2xl'],
  },
  otpInput: {
    width: 52,
    height: 58,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
  },
  timerBubble: {
    alignSelf: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary100,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  timerText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  resendCopy: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    marginBottom: Spacing.lg,
  },
  resendLink: {
    color: Colors.primary600,
    fontWeight: FontWeights.bold,
  },
  errorText: {
    textAlign: 'center',
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  verifyBtn: {
    height: 64,
    borderRadius: BorderRadius.xl,
    ...Shadows.lg,
    marginTop: Spacing.lg,
  },
  footerSecurity: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing['2xl'],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
