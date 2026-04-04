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
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../../theme';
import { InputField, PrimaryButton } from '../../components/ui';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, User, UserPlus } from 'lucide-react-native';

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
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
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
            <ArrowLeft color={Colors.textPrimary} size={20} />
          </TouchableOpacity>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.stepPill}>STEP 1 OF 4</Text>
            <Text style={styles.welcomeTitle}>Begin your journey.</Text>
            <Text style={styles.welcomeSubtitle}>
              Enter your details to create an Overline profile and start your concierge experience.
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
              icon={<User color={Colors.textSecondary} size={18} />}
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <InputField
              label="Email"
              icon={<Mail color={Colors.textSecondary} size={18} />}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View>
              <InputField
                label="Password"
                icon={<KeyRound color={Colors.textSecondary} size={18} />}
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff color={Colors.textSecondary} size={20} />
                ) : (
                  <Eye color={Colors.textSecondary} size={20} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

            <PrimaryButton
              title="Continue"
              onPress={handleRegister}
              loading={isLoading}
              icon={<UserPlus color="#fff" size={18} />}
              style={{ marginTop: Spacing.lg }}
            />
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
    backgroundColor: 'rgba(255, 140, 66, 0.12)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: 80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(84, 28, 191, 0.08)',
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
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['2xl'],
  },
  welcomeSection: {
    marginBottom: Spacing['3xl'],
  },
  stepPill: {
    fontSize: FontSizes.xs,
    color: Colors.primary600,
    letterSpacing: 1,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
  },
  welcomeTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    lineHeight: 38,
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
    marginBottom: Spacing.md,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
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

