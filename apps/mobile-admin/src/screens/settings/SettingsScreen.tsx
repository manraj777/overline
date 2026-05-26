import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { RootStackParamList } from '../../types';
import { apiClient } from '../../api/client';
import { 
  User, 
  ChevronRight, 
  Globe, 
  Moon, 
  Bell,
  Share2, 
  Info, 
  ShieldAlert, 
  LogOut, 
  Camera,
  CheckCircle2,
  Sparkles,
  X,
  Lock,
  Mail,
  Smartphone,
  Tag,
  ShieldCheck,
  Check
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const NOTIFICATION_SETTINGS_KEY = 'staff_notification_settings';

const PROMO_CODES = [
  { code: 'WELCOME10', discount: '10% OFF', desc: 'Valid on first appointment booking' },
  { code: 'OVERLINE20', discount: '20% OFF', desc: 'Flat discount on select specialties' },
  { code: 'WEEKEND30', discount: '₹100 OFF', desc: 'Valid on Fri, Sat & Sun slots' },
  { code: 'PROMO50', discount: 'Flat ₹50 OFF', desc: 'Valid on orders above ₹500' }
];

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, checkAuth } = useAuthStore();
  const [notificationSendTime, setNotificationSendTime] = useState('09:00');

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'PRIVACY' | 'TERMS'>('PRIVACY');
  
  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Appearance Theme state
  const [selectedTheme, setSelectedTheme] = useState('System (Dark)');

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY).then(raw => {
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as { sendTime?: string };
        if (parsed.sendTime) {
          setNotificationSendTime(parsed.sendTime);
        }
      } catch {
        // Ignore malformed local settings.
      }
    });

    AsyncStorage.getItem('theme_preference').then(theme => {
      if (theme) {
        setSelectedTheme(theme);
      }
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('Session Closure', 'Are you sure you want to exit the admin console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required');
    if (!email.trim()) return Alert.alert('Error', 'Email is required');
    
    setIsSavingProfile(true);
    try {
      await apiClient.patch('/users/me', { name, email, phone });
      await checkAuth();
      setShowProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSelectTheme = async (theme: string) => {
    setSelectedTheme(theme);
    await AsyncStorage.setItem('theme_preference', theme);
    setShowAppearanceModal(false);
  };

  const SettingItem = ({ icon: Icon, title, subtitle, value, onPress, color = '#64748B' }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemMain}>
        <View style={[styles.itemIcon, { backgroundColor: `${color}10` }]}>
          <Icon size={20} color={color} />
        </View>
        <View>
          <Text style={styles.itemTitle}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {value ? (
        <View style={styles.valueWrap}>
          <Text style={styles.valueText}>{value}</Text>
          <ChevronRight size={16} color="#CBD5E1" />
        </View>
      ) : (
        <ChevronRight size={18} color="#CBD5E1" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.header}>
          <Text style={styles.title}>System Settings</Text>
          <Text style={styles.subtitle}>Configure permissions & preferences</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <User size={32} color={Colors.primary} />
                <View style={styles.avatarBadge}>
                  <Camera size={10} color="#FFF" />
                </View>
              </View>
              <View style={styles.profileMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{user?.name || 'Admin Owner'}</Text>
                  <CheckCircle2 size={16} color="#10B981" />
                </View>
                <Text style={styles.profileStatus}>Verified Business Owner · Shop ID: 7721</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => {
              setName(user?.name || '');
              setEmail(user?.email || '');
              setPhone(user?.phone || '');
              setShowProfileModal(true);
            }}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EXPERIENCE</Text>
            <View style={styles.card}>
              <SettingItem 
                icon={Globe} 
                title="Language" 
                value="English" 
                color="#3B82F6" 
                onPress={() => Alert.alert('Language Selection', 'English is the default language configured for this system.')}
              />
              <View style={styles.divider} />
              <SettingItem 
                icon={Moon} 
                title="Appearance" 
                value={selectedTheme} 
                color="#8B5CF6" 
                onPress={() => setShowAppearanceModal(true)}
              />
              <View style={styles.divider} />
              <SettingItem
                icon={Bell}
                title="Notification Send Time"
                subtitle="Set the daily alert delivery time"
                value={notificationSendTime}
                color="#0EA5E9"
                onPress={() => navigation.navigate('NotificationSettings')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GROWTH & SUPPORT</Text>
            <View style={styles.card}>
              <SettingItem 
                icon={Share2} 
                title="Promo Codes" 
                subtitle="View active shop coupons"
                color="#10B981" 
                onPress={() => setShowPromoModal(true)}
              />
              <View style={styles.divider} />
              <SettingItem 
                icon={Info} 
                title="About Us" 
                color="#F59E0B" 
                onPress={() => Alert.alert('Overline Admin', 'Enterprise Operations Cloud. Designed and built by Google DeepMind team.')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LEGAL & SECURITY</Text>
            <View style={styles.card}>
              <SettingItem 
                icon={ShieldAlert} 
                title="Privacy & Terms" 
                color="#10B981" 
                onPress={() => {
                  setLegalModalType('PRIVACY');
                  setShowLegalModal(true);
                }}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#F43F5E" />
            <Text style={styles.logoutText}>Sign Out of Console</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Sparkles size={20} color="#CBD5E1" strokeWidth={1} />
            <Text style={styles.footerText}>Overline Admin Portal v2.4.0 (Dev 777)</Text>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Profile Edit Modal */}
        <Modal visible={showProfileModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}><X size={24} color="#0F172A" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <View style={styles.inputBox}>
                    <User size={18} color="#94A3B8" />
                    <TextInput style={styles.textInput} value={name} onChangeText={setName} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <View style={styles.inputBox}>
                    <Mail size={18} color="#94A3B8" />
                    <TextInput style={styles.textInput} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>MOBILE PHONE</Text>
                  <View style={styles.inputBox}>
                    <Smartphone size={18} color="#94A3B8" />
                    <TextInput style={styles.textInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                      <Check size={18} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Appearance Picker Modal */}
        <Modal visible={showAppearanceModal} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 32 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Theme Appearance</Text>
                <TouchableOpacity onPress={() => setShowAppearanceModal(false)}><X size={24} color="#0F172A" /></TouchableOpacity>
              </View>
              <View style={{ padding: 24, gap: 12 }}>
                {['Light Theme', 'Dark Theme', 'System (Dark)', 'OLED Black'].map((theme) => {
                  const isSel = selectedTheme === theme;
                  return (
                    <TouchableOpacity 
                      key={theme} 
                      style={[styles.themeOption, isSel && styles.themeOptionActive]}
                      onPress={() => handleSelectTheme(theme)}
                    >
                      <Text style={[styles.themeOptionText, isSel && styles.themeOptionTextActive]}>{theme}</Text>
                      {isSel && <Check size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* Promo Codes Modal */}
        <Modal visible={showPromoModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Active Promo Coupons</Text>
                <TouchableOpacity onPress={() => setShowPromoModal(false)}><X size={24} color="#0F172A" /></TouchableOpacity>
              </View>
              <FlatList
                data={PROMO_CODES}
                keyExtractor={(item: { code: string }) => item.code}
                contentContainerStyle={{ padding: 24 }}
                renderItem={({ item }: { item: { code: string; discount: string; desc: string } }) => (
                  <View style={styles.promoCard}>
                    <View style={styles.promoIconWrap}>
                      <Tag size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoCode}>{item.code}</Text>
                      <Text style={styles.promoDesc}>{item.desc}</Text>
                    </View>
                    <View style={styles.promoDiscountWrap}>
                      <Text style={styles.promoDiscount}>{item.discount}</Text>
                    </View>
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Legal Scrollable Modal */}
        <Modal visible={showLegalModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { height: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{legalModalType === 'PRIVACY' ? 'Privacy Policy' : 'Terms of Service'}</Text>
                <TouchableOpacity onPress={() => setShowLegalModal(false)}><X size={24} color="#0F172A" /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.legalHeader}>Overline Service Governance Protocol</Text>
                <Text style={styles.legalDate}>Last Updated: May 2026</Text>
                
                <Text style={styles.legalSectionTitle}>1. Operational Compliance</Text>
                <Text style={styles.legalText}>
                  Welcome to the Overline platform. By accessing or executing operations on our multi-tenant scheduling cloud, you accept full accountability and compliance with our system registry guidelines...
                </Text>

                <Text style={styles.legalSectionTitle}>2. Data Privacy & Verification</Text>
                <Text style={styles.legalText}>
                  We handle staff, owner, and client credentials with standard AES-256 server-side encryption. Verification checks, including phone OTP codes and email profiles, are carried out to ensure integrity...
                </Text>

                <Text style={styles.legalSectionTitle}>3. Booking Policies & Fee Schedule</Text>
                <Text style={styles.legalText}>
                  Refunds, payouts, and slot cancellations depend entirely on the rules configured by shop administrators. Payments routed through online channels utilize Razorpay APIs and follow direct merchant payout protocol...
                </Text>

                <Text style={styles.legalSectionTitle}>4. System Fair Use & Protection</Text>
                <Text style={styles.legalText}>
                  Any abuse of notifications, spamming slot lists, or registering fake storefronts will lead to direct termination of developer dashboard API sessions without prior notifications...
                </Text>

                <TouchableOpacity style={[styles.saveBtn, { marginTop: 32 }]} onPress={() => {
                  if (legalModalType === 'PRIVACY') {
                    setLegalModalType('TERMS');
                  } else {
                    setShowLegalModal(false);
                  }
                }}>
                  <Text style={styles.saveBtnText}>
                    {legalModalType === 'PRIVACY' ? 'VIEW TERMS OF SERVICE' : 'CLOSE DIALOG'}
                  </Text>
                  <ChevronRight size={18} color="#FFF" />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  profileCard: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.primary, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileMeta: { marginLeft: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  profileStatus: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginTop: 4 },
  editBtn: { backgroundColor: '#F8FAFC', height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  editBtnText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 16, marginLeft: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  itemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  itemSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFF1F2', height: 60, borderRadius: 20, marginBottom: 40 },
  logoutText: { color: '#F43F5E', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  footer: { alignItems: 'center', gap: 12 },
  footerText: { fontSize: 11, color: '#CBD5E1', fontWeight: '800', letterSpacing: 1 },

  // Modals styling
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, height: 52 },
  textInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  saveBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  
  // Theme options styling
  themeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
  themeOptionActive: { backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: Colors.primary },
  themeOptionText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  themeOptionTextActive: { color: Colors.primary, fontWeight: '800' },

  // Promo Codes card styling
  promoCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  promoIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  promoCode: { fontSize: 15, fontWeight: '900', color: '#1E293B', letterSpacing: 0.5 },
  promoDesc: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  promoDiscountWrap: { backgroundColor: Colors.primary100 || '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  promoDiscount: { fontSize: 11, fontWeight: '900', color: Colors.primary },

  // Legal documentation styling
  legalHeader: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  legalDate: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 4, marginBottom: 20 },
  legalSectionTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginTop: 24, marginBottom: 8 },
  legalText: { fontSize: 13, color: '#475569', lineHeight: 22, fontWeight: '600' },
});

