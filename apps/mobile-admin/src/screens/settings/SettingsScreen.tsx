import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { 
  User, 
  ChevronRight, 
  Globe, 
  Moon, 
  Share2, 
  Info, 
  ShieldAlert, 
  LogOut, 
  Camera,
  CheckCircle2,
  Sparkles
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Session Closure', 'Are you sure you want to exit the admin console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
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
                <Text style={styles.profileStatus}>Verified Business Owner • Shop ID: 7721</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn}>
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
              />
              <View style={styles.divider} />
              <SettingItem 
                icon={Moon} 
                title="Appearance" 
                value="System (Dark)" 
                color="#8B5CF6" 
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GROWTH & SUPPORT</Text>
            <View style={styles.card}>
              <SettingItem 
                icon={Share2} 
                title="Refer" 
                subtitle="Invite another business to Overline"
                color="#0EA5E9" 
              />
              <View style={styles.divider} />
              <SettingItem 
                icon={Info} 
                title="About Us" 
                color="#F59E0B" 
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
  avatar: { width: 64, height: 64, borderRadius: 24, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center' },
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
});
