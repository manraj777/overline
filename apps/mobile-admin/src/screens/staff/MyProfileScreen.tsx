import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { RootStackParamList } from '../../types';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { 
  ChevronRight, 
  User, 
  Settings, 
  Moon, 
  ShieldCheck, 
  FileText, 
  MessageSquare, 
  LogOut,
  Info,
  BadgeCheck
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('End Shift', 'Are you sure you want to log out of your specialist console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const SettingItem = ({ icon: Icon, title, subtitle, value, onPress, color = '#64748B' }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemMain}>
        <View style={[styles.itemIcon, { backgroundColor: `${color}10` }]}>
          <Icon size={18} color={color} />
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
          <Text style={styles.title}>Shift Governance</Text>
          <Text style={styles.subtitle}>Identity and operational preferences</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <User size={32} color={Colors.primary} />
              </View>
              <View style={styles.profileMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{user?.name || 'Specialist'}</Text>
                  <BadgeCheck size={16} color="#10B981" />
                </View>
                <Text style={styles.profileStatus}>Verified Team Member • Elite Wellness Studio</Text>
              </View>
            </View>
            <View style={styles.contactNotice}>
              <Info size={14} color="#64748B" />
              <Text style={styles.noticeText}>Contact your Shop Owner to update profile credentials.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VISUALS & PREFERENCES</Text>
            <View style={styles.card}>
              <SettingItem 
                icon={Moon} 
                title="Appearance" 
                value="System (Dark)" 
                color="#8B5CF6" 
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LEGAL & SUPPORT</Text>
            <View style={styles.card}>
              <SettingItem 
                icon={ShieldCheck} 
                title="Privacy Policy" 
                color="#10B981" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon={FileText} 
                title="Terms of Service" 
                color="#3B82F6" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon={MessageSquare} 
                title="Support Center" 
                color="#F59E0B" 
              />
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#F43F5E" />
            <Text style={styles.logoutText}>Sign Out of Console</Text>
          </TouchableOpacity>

          <View style={styles.versionWrap}>
            <Text style={styles.versionText}>Overline Specialist v2.4.0 (Build 777)</Text>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '800', marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  profileCard: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 24, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center' },
  profileMeta: { marginLeft: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  profileStatus: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginTop: 4 },
  contactNotice: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, alignItems: 'center' },
  noticeText: { flex: 1, fontSize: 11, color: '#64748B', fontWeight: '700', lineHeight: 16 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 16, marginLeft: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  itemSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueText: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFF1F2', height: 60, borderRadius: 20, marginBottom: 40 },
  logoutText: { color: '#F43F5E', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  versionWrap: { alignItems: 'center' },
  versionText: { fontSize: 10, color: '#CBD5E1', fontWeight: '900', letterSpacing: 1 },
});
