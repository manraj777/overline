import React, { useState, useEffect } from 'react';
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
  Platform,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ExternalLink,
  X
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);

  // Settings States
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Saved Addresses States
  const [addresses, setAddresses] = useState<Array<{ id: string; label: string; address: string }>>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Load settings and addresses on mount
  useEffect(() => {
    async function loadSettingsAndAddresses() {
      try {
        const stored = await AsyncStorage.getItem('user_saved_addresses');
        if (stored) {
          setAddresses(JSON.parse(stored));
        } else {
          const initial = [
            { id: '1', label: 'Office (Noida)', address: 'G-12, Sector 63, Noida, UP' },
            { id: '2', label: 'Home (Delhi)', address: '45, Connaught Place, New Delhi, DL' }
          ];
          await AsyncStorage.setItem('user_saved_addresses', JSON.stringify(initial));
          setAddresses(initial);
        }

        const pushVal = await AsyncStorage.getItem('settings_push');
        if (pushVal !== null) setPushEnabled(pushVal === 'true');
        const smsVal = await AsyncStorage.getItem('settings_sms');
        if (smsVal !== null) setSmsEnabled(smsVal === 'true');
        const waVal = await AsyncStorage.getItem('settings_wa');
        if (waVal !== null) setWhatsappEnabled(waVal === 'true');
      } catch (err) {
        console.warn('[ProfileScreen] Error loading data:', err);
      }
    }
    loadSettingsAndAddresses();
  }, []);

  const saveAddresses = async (updated: Array<{ id: string; label: string; address: string }>) => {
    try {
      setAddresses(updated);
      await AsyncStorage.setItem('user_saved_addresses', JSON.stringify(updated));
    } catch (err) {
      console.warn('[ProfileScreen] Error saving addresses:', err);
    }
  };

  const handleAddAddress = () => {
    if (!newLabel.trim() || !newAddress.trim()) {
      Alert.alert('Error', 'Please fill in both label and address fields');
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      label: newLabel.trim(),
      address: newAddress.trim()
    };
    const updated = [...addresses, newItem];
    saveAddresses(updated);
    setNewLabel('');
    setNewAddress('');
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter(item => item.id !== id);
    saveAddresses(updated);
  };

  const togglePush = async () => {
    const nextVal = !pushEnabled;
    setPushEnabled(nextVal);
    await AsyncStorage.setItem('settings_push', String(nextVal));
  };

  const toggleSms = async () => {
    const nextVal = !smsEnabled;
    setSmsEnabled(nextVal);
    await AsyncStorage.setItem('settings_sms', String(nextVal));
  };

  const toggleWhatsapp = async () => {
    const nextVal = !whatsappEnabled;
    setWhatsappEnabled(nextVal);
    await AsyncStorage.setItem('settings_wa', String(nextVal));
  };
  
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
        { id: 'addresses', label: 'Saved Addresses', icon: <MapPin size={20} color="#8B5CF6" />, onPress: () => setAddressesOpen(true) },
        { id: 'settings', label: 'App Settings', icon: <Settings size={20} color="#64748B" />, onPress: () => setSettingsOpen(true) },
      ]
    },
    {
      title: 'Assistance & Legal',
      items: [
        { id: 'help', label: 'Help Center', icon: <HelpCircle size={20} color="#EC4899" />, onPress: () => Linking.openURL('mailto:support@overline.in') },
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
          <View style={styles.avatarWrap}>
            <View style={styles.avatarInner}>
              {(profile?.avatarUrl || user?.avatarUrl) ? (
                <Image source={{ uri: profile?.avatarUrl || user?.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarPlaceholder}>
                  {(profile?.name || user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </View>
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

      {/* App Settings Modal */}
      <Modal visible={settingsOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>App Settings</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)} style={styles.closeBtn}>
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.settingOption}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingSub}>Receive updates about your booking status instantly</Text>
                </View>
                <Switch value={pushEnabled} onValueChange={togglePush} thumbColor={pushEnabled ? Colors.primary : "#f4f3f4"} trackColor={{ false: "#767577", true: Colors.primaryLight }} />
              </View>
              <View style={styles.settingOption}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>SMS Notifications</Text>
                  <Text style={styles.settingSub}>Get text messages for reminders and updates</Text>
                </View>
                <Switch value={smsEnabled} onValueChange={toggleSms} thumbColor={smsEnabled ? Colors.primary : "#f4f3f4"} trackColor={{ false: "#767577", true: Colors.primaryLight }} />
              </View>
              <View style={styles.settingOption}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>WhatsApp Notifications</Text>
                  <Text style={styles.settingSub}>Get updates and reminders via WhatsApp</Text>
                </View>
                <Switch value={whatsappEnabled} onValueChange={toggleWhatsapp} thumbColor={whatsappEnabled ? Colors.primary : "#f4f3f4"} trackColor={{ false: "#767577", true: Colors.primaryLight }} />
              </View>
              <View style={styles.settingOption}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Dark Mode (System Default)</Text>
                  <Text style={styles.settingSub}>Sync interface with device theme preferences</Text>
                </View>
                <Switch value={darkMode} onValueChange={setDarkMode} thumbColor={darkMode ? Colors.primary : "#f4f3f4"} trackColor={{ false: "#767577", true: Colors.primaryLight }} />
              </View>
              <View style={[styles.settingOption, { borderBottomWidth: 0 }]}>
                <View style={styles.settingTextWrap}>
                  <Text style={styles.settingLabel}>Default App Timezone</Text>
                  <Text style={styles.settingSub}>Locked to regional server timezone</Text>
                </View>
                <Text style={styles.timezoneBadge}>Asia/Kolkata</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Saved Addresses Modal */}
      <Modal visible={addressesOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Addresses</Text>
              <TouchableOpacity onPress={() => setAddressesOpen(false)} style={styles.closeBtn}>
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.formSectionTitle}>Add New Address</Text>
              <View style={styles.addressForm}>
                <TextInput
                  placeholder="Address Label (e.g. Home, Office, Gym)"
                  value={newLabel}
                  onChangeText={setNewLabel}
                  style={styles.addressInput}
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  placeholder="Full Address Description"
                  value={newAddress}
                  onChangeText={setNewAddress}
                  style={[styles.addressInput, { height: 60 }]}
                  multiline
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={handleAddAddress} style={styles.addAddressBtn}>
                  <Text style={styles.addAddressBtnText}>Add Address</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.formSectionTitle, { marginTop: 20 }]}>My Addresses</Text>
              {addresses.map((item) => (
                <View key={item.id} style={styles.addressCard}>
                  <View style={styles.addressCardInfo}>
                    <Text style={styles.addressCardLabel}>{item.label}</Text>
                    <Text style={styles.addressCardText}>{item.address}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteAddress(item.id)} style={styles.deleteAddressBtn}>
                    <Text style={styles.deleteAddressText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {addresses.length === 0 && (
                <Text style={styles.noAddressesText}>No saved addresses yet.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: BorderRadius.xl * 1.5,
    borderTopRightRadius: BorderRadius.xl * 1.5,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
    borderRadius: BorderRadius.sm,
  },
  modalScroll: {
    padding: Spacing.xl,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingTextWrap: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#1E293B',
  },
  settingSub: {
    fontSize: FontSizes.xs,
    color: '#64748B',
    marginTop: 2,
  },
  timezoneBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  formSectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  addressForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.sm,
  },
  addressInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    fontSize: FontSizes.sm,
    color: '#1E293B',
  },
  addAddressBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  addAddressBtnText: {
    color: '#FFF',
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  addressCardInfo: {
    flex: 1,
  },
  addressCardLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#1E293B',
  },
  addressCardText: {
    fontSize: FontSizes.xs,
    color: '#64748B',
    marginTop: 2,
  },
  deleteAddressBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  deleteAddressText: {
    color: '#EF4444',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  noAddressesText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: FontSizes.sm,
    marginVertical: Spacing.xl,
  },
});
