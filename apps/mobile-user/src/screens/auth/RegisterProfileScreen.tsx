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
import { ArrowLeft, Calendar, Camera, MapPin } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { RootStackParamList } from '../../types';
import { InputField, PrimaryButton } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegisterProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'RegisterProfile'>;

const genderOptions = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export default function RegisterProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { name, email, password, phone } = route.params;
  const { signup, isLoading } = useAuthStore();

  const [selectedGender, setSelectedGender] = useState('Female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');

  const onComplete = async () => {
    try {
      await signup({ name, email, password, phone });
    } catch {
      Alert.alert('Registration Failed', 'Could not complete setup. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeft color={Colors.primary600} size={24} />
            </TouchableOpacity>
            <View style={{ marginLeft: Spacing.lg }}>
              <Text style={styles.stepText}>STEP 4 OF 4</Text>
              <Text style={styles.title}>Profile Completion</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarPlaceholder}>
                <Camera color={Colors.textMuted} size={30} />
              </View>
              <TouchableOpacity style={styles.cameraFab}>
                <Camera color="#fff" size={16} />
              </TouchableOpacity>
            </View>
            <Text style={styles.uploadText}>Upload profile photo</Text>

            <Text style={styles.label}>Gender Identity</Text>
            <View style={styles.genderWrap}>
              {genderOptions.map(option => {
                const selected = option === selectedGender;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.genderChip, selected && styles.genderChipActive]}
                    onPress={() => setSelectedGender(option)}
                  >
                    <Text style={[styles.genderText, selected && styles.genderTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Date of Birth"
                  icon={<Calendar color={Colors.textSecondary} size={16} />}
                  placeholder="mm/dd/yyyy"
                  value={dob}
                  onChangeText={setDob}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Location"
                  icon={<MapPin color={Colors.textSecondary} size={16} />}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            <PrimaryButton
              title={isLoading ? 'Completing...' : 'Complete Setup'}
              onPress={onComplete}
              loading={isLoading}
              style={styles.completeButton}
            />

            <Text style={styles.disclaimer}>
              By completing your profile, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
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
    marginBottom: Spacing.lg,
  },
  stepText: {
    color: Colors.primary600,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
    fontSize: FontSizes.sm,
    marginBottom: 2,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary100,
    marginBottom: Spacing['2xl'],
  },
  progressFill: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary600,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.primary100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFab: {
    position: 'absolute',
    right: -4,
    bottom: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing['2xl'],
  },
  label: {
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  genderWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  genderChip: {
    backgroundColor: Colors.primary100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  genderChipActive: {
    backgroundColor: Colors.accent600,
    ...Shadows.sm,
  },
  genderText: {
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
    fontSize: FontSizes.md,
  },
  genderTextActive: {
    color: '#fff',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  completeButton: {
    height: 64,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    ...Shadows.lg,
  },
  disclaimer: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
});
