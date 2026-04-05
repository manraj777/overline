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
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { InputField, PrimaryButton } from '../../components/ui';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Sparkles, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Incomplete Form', 'Every detail matters. Please fill all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Too Short', 'Security first! Use at least 8 characters for your password.');
      return;
    }

    navigation.navigate('RegisterPhone', {
      name: name.trim(),
      email: email.trim(),
      password,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Aesthetic */}
      <View style={styles.headerAura}>
        <View style={styles.aura1} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>STEP 1 OF 3</Text>
            </View>
            <Text style={styles.title}>Join the</Text>
            <Text style={styles.emphasis}>Exclusive Circle</Text>
            <Text style={styles.subtitle}>Create your profile to access premium services nearby.</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputStack}>
              <View style={styles.inputBox}>
                <User size={18} color={Colors.textTertiary} />
                <InputField
                  placeholder="Full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  containerStyle={styles.cleanInput}
                />
              </View>

              <View style={[styles.inputBox, { marginTop: 16 }]}>
                <Mail size={18} color={Colors.textTertiary} />
                <InputField
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={styles.cleanInput}
                />
              </View>

              <View style={[styles.inputBox, { marginTop: 16 }]}>
                <Lock size={18} color={Colors.textTertiary} />
                <InputField
                  placeholder="Create password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  containerStyle={styles.cleanInput}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color={Colors.textSecondary} /> : <Eye size={18} color={Colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
              <Text style={styles.primaryBtnText}>NEXT STEP</Text>
              <ChevronRight size={18} color="#FFF" strokeWidth={3} />
            </TouchableOpacity>

            <View style={styles.legalBox}>
              <Sparkles size={14} color={Colors.primary} />
              <Text style={styles.legalText}>Join for free. Cancel anytime.</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Found your way back? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
    top: -height * 0.05,
    right: -width * 0.1,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  titleSection: {
    marginBottom: 40,
  },
  stepBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stepText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 38,
  },
  emphasis: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 12,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 36,
    padding: 28,
    ...Shadows.lg,
  },
  inputStack: {
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 64,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  cleanInput: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
    ...Shadows.glow,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  legalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  legalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    justifyContent: 'center',
    marginBottom: 40,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
});
