import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../../stores/authStore';
import {RootStackParamList} from '../../types';
import {
  Bell,
  ChartColumn,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock3,
  CreditCard,
  FileText,
  Store,
  Users,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {user, selectedShopId, setSelectedShop, logout, isOwner} = useAuthStore();

  const selectedShop = user?.shops?.find(s => s.id === selectedShopId);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: () => logout()},
    ]);
  };

  const handleShopSelect = (shopId: string) => {
    setSelectedShop(shopId);
    Alert.alert('Success', 'Shop changed successfully');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : user?.role === 'OWNER'
                    ? 'Shop Owner'
                    : 'Staff'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current Shop */}
        {selectedShop && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Shop</Text>
            <View style={styles.shopCard}>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{selectedShop.name}</Text>
                <Text style={styles.shopStatus}>Active</Text>
              </View>
              <TouchableOpacity
                style={styles.shopSettingsButton}
                onPress={() =>
                  navigation.navigate('ShopSettings', {
                    shopId: selectedShopId || '',
                  })
                }>
                <Text style={styles.shopSettingsText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Switch Shop (if multiple) */}
        {user?.shops && user.shops.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Switch Shop</Text>
            {user.shops.map(shop => (
              <TouchableOpacity
                key={shop.id}
                style={[
                  styles.shopOption,
                  shop.id === selectedShopId && styles.shopOptionSelected,
                ]}
                onPress={() => handleShopSelect(shop.id)}>
                <Text
                  style={[
                    styles.shopOptionName,
                    shop.id === selectedShopId && styles.shopOptionNameSelected,
                  ]}>
                  {shop.name}
                </Text>
                {shop.id === selectedShopId && (
                  <CircleCheck size={18} color="#4F46E5" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Shop Settings */}
        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Management</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                navigation.navigate('ShopSettings', {shopId: selectedShopId || ''})
              }>
              <Store size={20} color="#6B7280" style={styles.menuIcon} />
              <Text style={styles.menuText}>Shop Details</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                navigation.navigate('WorkingHours', {shopId: selectedShopId || ''})
              }>
              <Clock3 size={20} color="#6B7280" style={styles.menuIcon} />
              <Text style={styles.menuText}>Working Hours</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                navigation.navigate('StaffManagement', {
                  shopId: selectedShopId || '',
                })
              }>
              <Users size={20} color="#6B7280" style={styles.menuIcon} />
              <Text style={styles.menuText}>Staff Management</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                navigation.navigate('Analytics', {
                  shopId: selectedShopId || '',
                })
              }>
              <ChartColumn size={20} color="#6B7280" style={styles.menuIcon} />
              <Text style={styles.menuText}>Analytics</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                navigation.navigate('PayoutDetails', {
                  shopId: selectedShopId || '',
                })
              }>
              <CreditCard size={20} color="#6B7280" style={styles.menuIcon} />
              <Text style={styles.menuText}>Payout Details</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Bell size={20} color="#6B7280" style={styles.menuIcon} />
            <Text style={styles.menuText}>Notifications</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <CircleHelp size={20} color="#6B7280" style={styles.menuIcon} />
            <Text style={styles.menuText}>Help & Support</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <FileText size={20} color="#6B7280" style={styles.menuIcon} />
            <Text style={styles.menuText}>Terms & Privacy</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  profileCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  shopCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  shopStatus: {
    fontSize: 13,
    color: '#10B981',
  },
  shopSettingsButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shopSettingsText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  shopOption: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  shopOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  shopOptionName: {
    fontSize: 15,
    color: '#111827',
  },
  shopOptionNameSelected: {
    fontWeight: '600',
    color: '#4F46E5',
  },
  menuItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    marginRight: 12,
    width: 28,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 24,
  },
});
