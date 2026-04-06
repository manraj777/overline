import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import {
  LayoutDashboard,
  Users,
  Store,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  PlusCircle,
  ScanLine,
} from 'lucide-react-native';
import { Colors, Shadows, Radius, FontSize, FontWeight } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomSidebar(props: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const navigation = props.navigation;
  const currentRoute = props.state.routes[props.state.index].name;

  const navItems = [
    { name: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { name: 'Staff', label: 'Specialist Suite', icon: Users },
    { name: 'Shop', label: 'Shop Registry', icon: Store },
    { name: 'Payments', label: 'Financial Vault', icon: CreditCard },
    { name: 'Settings', label: 'System Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'A'}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.userRole}>Owner Module</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.navSection}>
          <Text style={styles.sectionLabel}>ADMINISTRATIVE HUB</Text>
          {navItems.map((item) => {
            const isActive = currentRoute === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => navigation.navigate(item.name)}
              >
                <View style={styles.navItemMain}>
                  <item.icon
                    size={20}
                    color={isActive ? Colors.primary : Colors.gray400}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                </View>
                {isActive && <ChevronRight size={16} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionLabel}>QUICK OPERATIONS</Text>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => navigation.navigate('VerifyCode')}
          >
            <ScanLine size={18} color="#FFF" />
            <Text style={styles.actionText}>VERIFY CODE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#0F172A' }]}
            onPress={() => navigation.navigate('AddStaff')}
          >
            <PlusCircle size={18} color="#FFF" />
            <Text style={styles.actionText}>ADD WALK-IN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.gray400} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Overline v2.4.0-Premium</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  userMeta: { marginLeft: 16 },
  userName: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  userRole: { fontSize: 10, fontWeight: '900', color: Colors.primary, letterSpacing: 1, marginTop: 2 },
  scroll: { flex: 1, padding: 24 },
  sectionLabel: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#94A3B8', 
    letterSpacing: 1.5, 
    marginBottom: 16,
    marginTop: 8
  },
  navSection: { marginBottom: 32 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  navItemActive: { backgroundColor: Colors.primary100 },
  navItemMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  navLabelActive: { color: Colors.primary },
  quickActions: { gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 18,
    ...Shadows.md,
  },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  version: { fontSize: 10, color: '#CBD5E1', fontWeight: '800', marginTop: 16 },
});
