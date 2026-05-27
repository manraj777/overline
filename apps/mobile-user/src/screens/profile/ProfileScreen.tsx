  import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Share, 
  Linking, 
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { userApi } from '../../api/client';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, 
  Bell, 
  MapPin, 
  MessageSquare, 
  HelpCircle, 
  Star, 
  Info, 
  FileText, 
  Lock, 
  LogOut, 
  ChevronRight,
  Gift,
  Settings,
  CreditCard,
  Heart,
  ExternalLink
} from 'lucide-react-native';
import { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string; name: string; email: string; phone: string;
  avatarUrl?: string;
  referralCode: string; walletBalance: number; totalBookings: number; createdAt: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, isAuthenticated } = useAuthStore();
  
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile().then(res => res.data),
    enabled: isAuthenticated,
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
        message: `Join Overline and get ₹50 gift! Use my referral code: ${profile?.referralCode}. Download: https://overline.in`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.unauthContainer}>
          <User color={Colors.primary} size={64} style={{ marginBottom: 20 }} />
          <Text style={styles.unauthTitle}>Your Profile</Text>
          <Text style={styles.unauthSubtitle}>
            Log in to manage your appointments, edit details, and configure notification preferences.
          </Text>
          <TouchableOpacity
            style={styles.unauthBtn}
            onPress={() => navigation.navigate('Login' as any)}
          >
            <Text style={styles.unauthBtnText}>SIGN IN / SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const sections = [
    {
      title: 'Activity',
      items: [
        { id: 'bookings', label: 'Booking History', icon: <CreditCard size={20} color="#3B82F6" />, onPress: () => navigation.navigate('MyBookings' as any) },
        { id: 'favorites', label: 'Favorites', icon: <Heart size={20} color="#EF4444" />, onPress: () => {} },
        { id: 'notifs', label: 'Notifications', icon: <Bell size={20} color="#F59E0B" />, onPress: () => navigation.navigate('Notifications') },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'edit', label: 'Personal Information', icon: <User size={20} color="#10B981" />, onPress: () => navigation.navigate('EditProfile') },
        { id: 'addresses', label: 'Saved Addresses', icon: <MapPin size={20} color="#8B5CF6" />, onPress: () => {} },
        { id: 'settings', label: 'App Settings', icon: <Settings size={20} color="#64748B" />, onPress: () => {} },
      ]
    },
    {
      title: 'Assistance & Legal',
      items: [
        { id: 'help', label: 'Help Center', icon: <HelpCircle size={20} color="#EC4899" />, onPress: () => Linking.openURL('https://overline.in/support') },
        { id: 'rate', label: 'Rate the App', icon: <Star size={20} color="#FACC15" />, onPress: () => {} },
        { id: 'terms', label: 'Terms of Service', icon: <FileText size={20} color="#94A3B8" />, onPress: () => Linking.openURL('https://overline.in/terms') },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.9}>
            <View style={styles.avatarInner}>
              {(profile?.avatarUrl || user?.avatarUrl) ? (
                <Image source={{ uri: profile?.avatarUrl || user?.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarPlaceholder}>
                  {(profile?.name || user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <Settings size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name || user?.name}</Text>
          <Text style={styles.profileMeta}>{profile?.email || user?.email}</Text>
        </View>

        {/* Stats Glass Card */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>₹{profile?.walletBalance || 0}</Text>
            <Text style={styles.statLab}>CREDITS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile?.totalBookings || 0}</Text>
            <Text style={styles.statLab}>EXPERIENCES</Text>
          </View>
        </View>

        {/* Exclusive Referral Section */}
        <TouchableOpacity style={styles.referralOuter} activeOpacity={0.95} onPress={handleShareReferral}>
          <View style={styles.referralContent}>
            <View style={styles.referralIcon}>
              <Gift size={24} color="#FFF" />
            </View>
            <View style={styles.referralTextRow}>
              <Text style={styles.referralTitle}>Invite Friend, Earn ₹50</Text>
              <Text style={styles.referralSubtitle}>Get free credits for every successful booking</Text>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>

        {/* Sectioned Menu */}
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIdx) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.menuItem, itemIdx === section.items.length - 1 && styles.noBorder]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuIconWrap}>{item.icon}</View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionInfo}>Overline v2.0.1 (Stable)</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 30,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    zIndex: 10,
  },
  headerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 20,
    ...Shadows.glow,
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
  },
  profileMeta: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    marginTop: -25,
    borderRadius: 24,
    paddingVertical: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    zIndex: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLab: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },
  referralOuter: {
    margin: 24,
    marginTop: 32,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    padding: 2,
    ...Shadows.glow,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    gap: 16,
  },
  referralIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralTextRow: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  referralSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 24,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 16,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#FEF2F2',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '900',
  },
  versionInfo: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl * 1.5,
    backgroundColor: Colors.background,
  },
  unauthTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    fontWeight: '600',
  },
  unauthBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.xl,
    width: '100%',
    alignItems: 'center',
  },
  unauthBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
