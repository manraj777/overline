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
  StatusBar,
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
import { Config } from '../../config';
import { 
  Smartphone, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ChevronRight,
  Zap,
  Star
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const BRAND_LOGO = require('../../../assets/branding/overline-logo.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, googleLogin, sendOtp, isLoading, error, clearError } = useAuthStore();

  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (Config.FEATURES.GOOGLE_AUTH_ENABLED && Config.GOOGLE?.WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: Config.GOOGLE.WEB_CLIENT_ID,
        offlineAccess: Config.GOOGLE.OFFLINE_ACCESS,
      });
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('No ID token received');
      await googleLogin(idToken);
    } catch (signInError: any) {
      if (signInError.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Error', signInError.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Incomplete Number', 'Please enter your 10-digit mobile number.');
      return;
    }
    const normalized = `+91${cleaned}`;

    setIsSendingOtp(true);
    try {
      await sendOtp(normalized);
      navigation.navigate('OtpVerify', { phone: normalized });
    } catch (err: any) {
      // Error handled in store, but clear local loading
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Aesthetic Background */}
      <View style={styles.headerAura}>
        <View style={styles.aura1} />
        <View style={styles.aura2} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          <View style={styles.branding}>
            <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
            <View style={styles.badgeRow}>
              <View style={styles.liveBadge}>
                <Zap size={10} color="#FFF" fill="#FFF" />
                <Text style={styles.liveText}>TOP RATED SERVICES</Text>
              </View>
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.welcomeText}>The best services,</Text>
            <Text style={styles.emphasisText}>Just a tap away.</Text>
            <Text style={styles.description}>Join 5,000+ users booking salons and clinics on Overline dailly.</Text>
          </View>

          <View style={styles.loginCard}>
            {/* Mode Switcher */}
            <View style={styles.modeToggle}>
              <TouchableOpacity 
                style={[styles.modeBtn, loginMode === 'phone' && styles.modeBtnActive]}
                onPress={() => { setLoginMode('phone'); clearError(); }}
              >
                <Text style={[styles.modeBtnText, loginMode === 'phone' && styles.modeBtnTextActive]}>Mobile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, loginMode === 'email' && styles.modeBtnActive]}
                onPress={() => { setLoginMode('email'); clearError(); }}
              >
                <Text style={[styles.modeBtnText, loginMode === 'email' && styles.modeBtnTextActive]}>Email</Text>
              </TouchableOpacity>
            </View>

            {loginMode === 'phone' ? (
              <View>
                <View style={[styles.inputGroup, error ? styles.inputError : null]}>
                  <Text style={styles.countryCode}>+91</Text>
                  <View style={styles.inputDivider} />
                  <Smartphone size={20} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter mobile number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={10}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryBtn, isSendingOtp && { opacity: 0.7 }]} 
                  onPress={handlePhoneLogin}
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>GET STARTED</Text>
                      <ArrowRight size={18} color="#FFF" strokeWidth={3} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.inputGroup}>
                  <Mail size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <View style={[styles.inputGroup, { marginTop: 16 }]}>
                  <Lock size={18} color={Colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
                
                <TouchableOpacity style={styles.loginBtn} onPress={() => login(email, password)}>
                  <Text style={styles.primaryBtnText}>SIGN IN</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ONE-TAP SECURE ACCESS</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity 
              style={styles.googleBtn} 
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Image source={require('../../../assets/icons/google-icon.png')} style={styles.socialIcon} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ShieldCheck size={16} color="#94A3B8" />
            <Text style={styles.footerText}>
              By continuing, you agree to our <Text style={styles.link}>Terms</Text> and <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerAura: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  aura1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  aura2: {
    position: 'absolute',
    top: height * 0.1,
    left: -width * 0.3,
    width: width,
    height: width,
    borderRadius: width / 2,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: height * 0.1,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  liveText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  titleSection: {
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 40,
  },
  emphasisText: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.primary,
    lineHeight: 40,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: '85%',
  },
  loginCard: {
    backgroundColor: '#FFF',
    borderRadius: 36,
    padding: 28,
    ...Shadows.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#FFF',
    ...Shadows.sm,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#0F172A',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 64,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
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
    gap: 12,
    ...Shadows.glow,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  loginBtn: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    gap: 16,
  },
  divider: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#F1F5F9',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  link: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
