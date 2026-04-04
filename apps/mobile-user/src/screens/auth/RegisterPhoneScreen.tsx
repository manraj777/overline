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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { InputField, PrimaryButton } from '../../components/ui';
import { ArrowLeft, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegisterPhone'>;
type RouteProps = RouteProp<RootStackParamList, 'RegisterPhone'>;

export default function RegisterPhoneScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { name, email, password } = route.params;
  const { sendOtp } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const onSendCode = async () => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^0+/, '');
    if (cleaned.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    const normalized = cleaned.startsWith('+91')
      ? cleaned
      : cleaned.startsWith('91') && cleaned.length > 10
        ? `+${cleaned}`
        : `+91${cleaned}`;

    setIsSendingOtp(true);
    try {
      await sendOtp(normalized);
      navigation.navigate('RegisterOtp', { name, email, password, phone: normalized });
    } catch {
      Alert.alert('OTP Failed', 'Could not send OTP right now. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft color={Colors.primary} size={20} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Verify Phone</Text>
            <Text style={styles.stepLabel}>STEP 2 OF 4</Text>
          </View>

          <Text style={styles.heroTitle}>Your identity,{"\n"}secured.</Text>
          <Text style={styles.heroSubtitle}>We'll send a 6-digit code to verify your number.</Text>

          <InputField
            label="Phone Number"
            icon={<Smartphone color={Colors.textSecondary} size={18} />}
            placeholder="98765 43210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={13}
          />

          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <ShieldCheck color={Colors.primary} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Data Protection</Text>
              <Text style={styles.infoText}>
                Your number is used only for account security and will never be shared.
              </Text>
            </View>
          </View>

          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>COMING UP NEXT</Text>
            <Text style={styles.nextText}>OTP Verification</Text>
          </View>

          <PrimaryButton
            title={isSendingOtp ? 'Sending Code...' : 'Send Code'}
            onPress={onSendCode}
            loading={isSendingOtp}
            style={styles.sendButton}
          />
          <Text style={styles.footerNote}>Standard SMS rates may apply.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4fb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 56,
    paddingBottom: Spacing['2xl'],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    flex: 1,
    marginLeft: Spacing.lg,
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
  stepLabel: {
    fontSize: FontSizes.xl,
    letterSpacing: 2,
    color: Colors.textMuted,
    fontWeight: FontWeights.bold,
  },
  heroTitle: {
    fontSize: 58,
    lineHeight: 58,
    fontWeight: FontWeights.extrabold,
    color: Colors.primary600,
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    fontSize: FontSizes['2xl'],
    color: Colors.textSecondary,
    lineHeight: 34,
    marginBottom: Spacing['3xl'],
  },
  infoCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing['3xl'],
    backgroundColor: '#e9eefb',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary100,
  },
  infoTitle: {
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  nextCard: {
    backgroundColor: Colors.primary100,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  nextLabel: {
    color: Colors.primary600,
    fontWeight: FontWeights.bold,
    letterSpacing: 2,
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  nextText: {
    color: Colors.textPrimary,
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.semibold,
  },
  sendButton: {
    height: 72,
    borderRadius: BorderRadius.xl,
    ...Shadows.lg,
  },
  footerNote: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
  },
});
