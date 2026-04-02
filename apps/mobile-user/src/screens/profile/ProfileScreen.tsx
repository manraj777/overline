import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Share, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { userApi } from '../../api/client';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Upload, User, Bell, MapPin, MessageSquare, HelpCircle, Star, Info, FileText, Lock, LogOut, ChevronRight } from 'lucide-react-native';
import { RootStackParamList } from '../../types';

interface UserProfile {
  id: string; name: string; email: string; phone: string;
  referralCode: string; walletBalance: number; totalBookings: number; createdAt: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile().then(res => res.data),
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join Overline and get ₹50 free cash! Use my referral code: ${profile?.referralCode}. Download now: https://overline.app`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name || user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name || user?.name}</Text>
          <Text style={styles.email}>{profile?.email || user?.email}</Text>
          {profile?.phone && <Text style={styles.phone}>{profile.phone}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{profile?.walletBalance || 0}</Text>
            <Text style={styles.statLabel}>FREE CASH</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.totalBookings || 0}</Text>
            <Text style={styles.statLabel}>BOOKINGS</Text>
          </View>
        </View>

        {/* Referral Card */}
        {profile?.referralCode && (
          <View style={styles.referralCard}>
            <View style={styles.referralGlow} />
            <Text style={styles.referralTitle}>Invite & Earn</Text>
            <Text style={styles.referralSubtitle}>Share your code and get ₹50 when a friend books!</Text>
            <View style={styles.referralCodeBox}>
              <Text style={styles.referralCode}>{profile.referralCode}</Text>
            </View>
            <PrimaryButton
              title="Share Referral Code"
              onPress={handleShareReferral}
              variant="secondary"
              icon={<Upload color="#fff" size={18} />}
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }}
            />
          </View>
        )}

        {/* Menu Sections */}
        {[
          {
            title: 'ACCOUNT',
            items: [
              { icon: <User color={Colors.textSecondary} size={20} />, label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
              { icon: <Bell color={Colors.textSecondary} size={20} />, label: 'Notifications', onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available in the next update.') },
              { icon: <MapPin color={Colors.textSecondary} size={20} />, label: 'Saved Addresses', onPress: () => Alert.alert('Coming Soon', 'Address management will be available in the next update.') },
            ],
          },
          {
            title: 'SUPPORT',
            items: [
              { icon: <MessageSquare color={Colors.textSecondary} size={20} />, label: 'Contact Support', onPress: () => Linking.openURL('mailto:support@overline.app') },
              { icon: <HelpCircle color={Colors.textSecondary} size={20} />, label: 'FAQs', onPress: () => Linking.openURL('https://overline.app/faq') },
              { icon: <Star color={Colors.textSecondary} size={20} />, label: 'Rate the App', onPress: () => Alert.alert('Thank You!', 'Rating will be available once the app is published to the Play Store.') },
            ],
          },
          {
            title: 'LEGAL',
            items: [
              { icon: <Info color={Colors.textSecondary} size={20} />, label: 'About Overline', onPress: () => Linking.openURL('https://overline.app/about') },
              { icon: <FileText color={Colors.textSecondary} size={20} />, label: 'Terms of Service', onPress: () => Linking.openURL('https://overline.app/terms') },
              { icon: <Lock color={Colors.textSecondary} size={20} />, label: 'Privacy Policy', onPress: () => Linking.openURL('https://overline.app/privacy') },
            ],
          },
        ].map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, ii) => (
              <TouchableOpacity key={ii} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.menuIconContainer}>{item.icon}</View>
                <Text style={styles.menuText}>{item.label}</Text>
                <ChevronRight color={Colors.textTertiary} size={20} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg }}>
          <PrimaryButton title="Logout" onPress={handleLogout} variant="danger" icon={<LogOut color="#fff" size={20} />} />
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    alignItems: 'center', paddingVertical: Spacing['3xl'],
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg, ...Shadows.glow,
  },
  avatarText: { fontSize: 36, fontWeight: FontWeights.extrabold, color: '#fff' },
  name: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: 2 },
  phone: { fontSize: FontSizes.sm, color: Colors.textTertiary },
  statsContainer: {
    flexDirection: 'row', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold, color: Colors.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  referralCard: {
    margin: Spacing.xl, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, overflow: 'hidden', ...Shadows.glow,
  },
  referralGlow: {
    position: 'absolute', top: -40, right: -40, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  referralTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#fff', marginBottom: 4 },
  referralSubtitle: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.lg },
  referralCodeBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', padding: Spacing.lg, borderRadius: BorderRadius.lg,
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  referralCode: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold, color: '#fff', letterSpacing: 3 },
  section: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: Colors.textTertiary,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, letterSpacing: 1.5,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuIconContainer: { marginRight: Spacing.md, width: 28, alignItems: 'center' },
  menuText: { flex: 1, fontSize: FontSizes.md, color: Colors.textPrimary },
  menuArrow: { fontSize: 20, color: Colors.textTertiary },
  version: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: Spacing['2xl'], letterSpacing: 1 },
});
