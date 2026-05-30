import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { userApi } from '../../api/client';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../../theme';
import { InputField, PrimaryButton } from '../../components/ui';
import { Mail, Phone, User } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { user, checkAuth } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const hasChanges = useMemo(() => {
    return (
      name.trim() !== (user?.name || '').trim() ||
      phone.trim() !== (user?.phone || '').trim()
    );
  }, [name, phone, user?.name, user?.phone]);

  const updateProfile = useMutation({
    mutationFn: () =>
      userApi.updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await checkAuth();
      Alert.alert('Profile updated', 'Your profile details were saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Update failed', error?.response?.data?.message || 'Could not update profile right now.');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Keep your details up to date for smoother bookings.</Text>
          </View>

          <View style={styles.formCard}>
            <InputField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              icon={<User color={Colors.textSecondary} size={18} />}
            />

            <InputField
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              icon={<Phone color={Colors.textSecondary} size={18} />}
            />

            <View style={styles.emailField}>
              <Text style={styles.emailLabel}>Email</Text>
              <View style={styles.emailValueRow}>
                <Mail color={Colors.textSecondary} size={18} />
                <Text style={styles.emailValue}>{user?.email}</Text>
              </View>
              <Text style={styles.emailHint}>Email changes are not supported from mobile app yet.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title="Save Changes"
            onPress={() => updateProfile.mutate()}
            loading={updateProfile.isPending}
            disabled={!hasChanges || updateProfile.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardRoot: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 120,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  emailField: {
    marginTop: 4,
    paddingVertical: Spacing.md,
  },
  emailLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  emailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  emailValue: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    flex: 1,
  },
  emailHint: {
    color: Colors.textTertiary,
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 28,
  },
});
