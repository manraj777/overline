import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { otpApi, authApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Shadows } from '../../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    setIsSendingOtp(true);
    try {
      await otpApi.send(identifier.trim(), 'LOGIN');
      setStep('verify');
      setResendCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send OTP. User may not exist.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResetPassword = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      Alert.alert('Invalid', 'Please enter a valid 6-digit OTP.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Invalid', 'Password must be at least 8 characters.');
      return;
    }
    setIsResetting(true);
    try {
      await authApi.resetPassword({ identifier: identifier.trim(), otp, newPassword });
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Password reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={styles.badge}>
              <ShieldCheck size={10} color="#10B981" fill="#10B981" />
              <Text style={styles.badgeText}>SECURE</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your phone number to receive a secure verification code.'
                : `Enter the 6-digit code sent to ${identifier} and choose a new password.`}
            </Text>

            {step === 'request' ? (
              <>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="+91XXXXXXXXXX"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  style={styles.input}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, isSendingOtp && { opacity: 0.6 }]}
                  onPress={handleSendOtp}
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.label}>VERIFICATION CODE</Text>
                  <TouchableOpacity onPress={() => { setStep('request'); setOtpDigits(['', '', '', '', '', '']); }}>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.otpRow}>
                  {otpDigits.map((d, i) => (
                    <TextInput
                      key={i}
                      ref={r => { otpRefs.current[i] = r; }}
                      value={d}
                      onChangeText={v => handleOtpChange(i, v)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(i, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                    />
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 24 }]}>NEW PASSWORD</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min 8 characters"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    style={[styles.input, { paddingRight: 50 }]}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={Colors.textTertiary} />
                    ) : (
                      <Eye size={20} color={Colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isResetting && { opacity: 0.6 }]}
                  onPress={handleResetPassword}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  {resendCountdown > 0 ? (
                    <Text style={styles.resendTimer}>Resend code in {resendCountdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp}>
                      <Text style={styles.resendLink}>Resend Code</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backToLoginText}>
                Remember your password?{' '}
                <Text style={styles.backToLoginBold}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginTop: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '900', color: '#10B981', letterSpacing: 0.5 },
  scroll: { padding: 24, paddingBottom: 60 },
  subtitle: { fontSize: 15, fontWeight: '600', color: '#64748B', marginBottom: 28, lineHeight: 22 },
  label: {
    fontSize: 10, fontWeight: '900', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '600', color: '#0F172A',
    borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20, ...Shadows.sm,
  },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 4, ...Shadows.md,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  otpHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  changeLink: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  otpBox: {
    flex: 1, height: 56, borderRadius: 14, backgroundColor: '#FFF',
    textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#0F172A',
    borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 16, top: 17 },
  resendRow: { alignItems: 'center', marginTop: 20 },
  resendTimer: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  resendLink: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  backToLogin: { alignItems: 'center', marginTop: 32 },
  backToLoginText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  backToLoginBold: { fontWeight: '800', color: Colors.primary },
});
