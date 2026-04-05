import React, { useState, useEffect } from 'react';
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
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../../stores/authStore';
import { Colors, FontSize, FontWeight, Radius, Spacing, Shadows } from '../../theme';
import { RootStackParamList } from '../../types';
import { Smartphone, Mail, Lock, ShieldCheck, ChevronRight, Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
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
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, loginWithGoogle, sendPhoneLoginOtp } = useAuthStore();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Valid email is required';
    if (!password || password.length < 6) newErrors.password = 'Min 6 characters required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(email, password, { requestedRole: role });
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const googleUser = await GoogleSignin.signIn();
      const idToken = googleUser.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');
      await loginWithGoogle(idToken, { requestedRole: 'OWNER' });
    } catch (error: any) {
      Alert.alert('Google Error', error.message || 'Login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    
    if (digits.length < 10) {
      Alert.alert('Invalid Phone', 'Enter a valid 10-digit number');
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
    } catch (error: any) {
      Alert.alert('OTP Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsPhoneLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topCurtain} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Overline Business</Text>
            <Text style={styles.subtitle}>Partner Dashboard & Management</Text>
          </View>

          {/* Role Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, role === 'OWNER' && styles.toggleBtnActive]}
              onPress={() => setRole('OWNER')}
            >
              <Text style={[styles.toggleText, role === 'OWNER' && styles.toggleTextActive]}>OWNER</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, role === 'STAFF' && styles.toggleBtnActive]}
              onPress={() => setRole('STAFF')}
            >
              <Text style={[styles.toggleText, role === 'STAFF' && styles.toggleTextActive]}>STAFF</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.formTitle}>
              {role === 'OWNER' ? 'Shop Proprietor Login' : 'Team Member Access'}
            </Text>
            
            {role === 'OWNER' ? (
              <View>
                <TouchableOpacity 
                  style={styles.googleBtn} 
                  onPress={handleGoogleLogin}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color={Colors.textPrimary} />
                  ) : (
                    <>
                      <Image source={require('../../../assets/icons/google-icon.png')} style={styles.socialIcon} />
                      <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>SECURE PHONE LOGIN</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.inputWrapper}>
                  <Smartphone size={20} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryBtn, isPhoneLoading && { opacity: 0.7 }]}
                  onPress={handleSendPhoneOtp}
                  disabled={isPhoneLoading}
                >
                  {isPhoneLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>GET LOGIN CODE</Text>
                      <Zap size={16} color="#FFF" fill="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                  <Mail size={20} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Staff Email"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                <View style={[styles.inputWrapper, { marginTop: 16 }, errors.password && styles.inputError]}>
                  <Lock size={20} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                <TouchableOpacity 
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>SIGN IN TO SHIFT</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.securityBox}>
              <ShieldCheck size={14} color={Colors.primary} />
              <Text style={styles.securityText}>End-to-end encrypted session</Text>
            </View>
          </View>

          <Text style={styles.footerInfo}>Overline v2.0 Enterprise Cloud</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topCurtain: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: height * 0.35,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: Radius.xl,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 6,
    marginBottom: 32,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#FFF',
    ...Shadows.sm,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 24,
    textAlign: 'center',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    height: 60,
  },
  inputError: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 24,
    gap: 8,
    ...Shadows.glow,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 12,
    fontWeight: '600',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  footerInfo: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
});
