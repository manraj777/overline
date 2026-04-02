import React, {useState, useRef, useEffect} from 'react';
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
} from 'react-native';
import {LockKeyhole, ShieldCheck} from 'lucide-react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import {useNavigation} from '@react-navigation/native';
import {otpApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {RootStackParamList} from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'OtpVerify'>;

const OTP_LENGTH = 6;

export default function OtpVerifyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const {phone} = route.params;
  const {completeOtpVerification, logout} = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);

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
      const digits = value.replace(/\D/g, '').split('');
      for (let i = 0; i < OTP_LENGTH && i < digits.length; i++) {
        newOtp[i] = digits[i];
      }
      setOtp(newOtp);
      const lastFilledIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();
      if (digits.length >= OTP_LENGTH) {
        verifyOtp(newOtp.join(''));
      }
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

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
      await otpApi.verify(phone, code, 'LOGIN');
      completeOtpVerification();
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
      Alert.alert('Error', err.response?.data?.message || 'Failed to resend OTP');
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

  const handleBackToLogin = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <LockKeyhole size={34} color="#4F46E5" />
          </View>
          <Text style={styles.title}>Verify Identity</Text>
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
              onKeyPress={({nativeEvent}) =>
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
            <ActivityIndicator color="#4F46E5" size="small" />
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
                <ActivityIndicator color="#4F46E5" size="small" />
              ) : (
                <Text style={styles.resendText}>Resend Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Security info */}
        <View style={styles.securityNote}>
          <ShieldCheck size={18} color="#4B5563" style={styles.securityIcon} />
          <Text style={styles.securityText}>
            This verification protects your admin account. The code expires in
            10 minutes.
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneHighlight: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  otpInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  verifyingText: {
    color: '#6B7280',
    fontSize: 15,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  countdownText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  countdownNumber: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  resendText: {
    color: '#4F46E5',
    fontSize: 15,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityIcon: {
    marginTop: 1,
  },
  securityText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },
  backButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
