import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { shopApi, staffApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Shadows } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { Bell, Camera, MapPin, Pencil, Save, Store, Users, Globe } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteProps = RouteProp<RootStackParamList, 'ShopSettings'>;
type ShopTab = 'shop' | 'media' | 'settings';

const SHOP_TYPES = ['Salon', 'Medical', 'Gym', 'Spa', 'Clinic', 'Other'];

export default function ShopSettingsScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { selectedShopId } = useAuthStore();
  const shopId = (route.params as any)?.shopId || selectedShopId || '';

  const [activeTab, setActiveTab] = useState<ShopTab>('shop');
  const [formData, setFormData] = useState({
    name: '',
    shopType: 'Salon',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    location: '',
    googleMapLink: '',
    workingTime: '09:00 - 21:00',
  });

  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    bookingConfirmation: true,
    bookingReminder: true,
    bookingCancellation: true,
    queueUpdates: false,
    newBooking: true,
    adminCancellation: true,
    dailySummary: false,
  });

  const { data: shop, isLoading } = useQuery({
    queryKey: ['adminShopSettings', shopId],
    queryFn: () => shopApi.getSettings(shopId).then(res => res.data),
    enabled: !!shopId,
  });

  const { data: staffRows = [] } = useQuery({
    queryKey: ['adminStaff', shopId],
    queryFn: () => staffApi.getAll(shopId).then(res => res.data || []),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (!shop) return;

    setFormData({
      name: shop.name || '',
      shopType: String(shop.settings?.shopType || 'Salon'),
      phone: shop.phone || '',
      email: shop.email || '',
      address: shop.address || '',
      city: shop.city || '',
      state: shop.state || '',
      postalCode: shop.postalCode || '',
      location: String(shop.settings?.location || ''),
      googleMapLink: String(shop.settings?.googleMapLink || ''),
      workingTime: String(shop.settings?.workingTime || '09:00 - 21:00'),
    });

    const savedNotifications = shop.settings?.notifications || {};
    setNotificationSettings(prev => ({ ...prev, ...savedNotifications }));
  }, [shop]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => shopApi.updateSettings(shopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminShopSettings', shopId] });
      Alert.alert('Success', 'Shop details updated successfully.');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      Alert.alert('Update failed', Array.isArray(message) ? message.join(', ') : message || 'Please try again.');
    },
  });

  const autofillMutation = useMutation({
    mutationFn: (query: string) => shopApi.autofillFromGoogleMaps(shopId, query),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminShopSettings', shopId] });
      Alert.alert('Autofill complete', 'Shop details, location, and photos fetched from Google Maps.');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      Alert.alert('Autofill failed', Array.isArray(message) ? message.join(', ') : message || 'Could not find place on Google Maps.');
    },
  });

  const handleAutofill = () => {
    const query = formData.googleMapLink || `${formData.name} ${formData.city}`;
    if (!query.trim()) {
      Alert.alert('Query required', 'Please enter shop name, city, or Google link to autofill.');
      return;
    }
    autofillMutation.mutate(query);
  };

  const saveShopDetails = () => {
    updateMutation.mutate({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode,
      settings: {
        ...(shop?.settings || {}),
        shopType: formData.shopType,
        location: formData.location,
        googleMapLink: formData.googleMapLink,
        workingTime: formData.workingTime,
      },
    });
  };

  const saveNotifications = () => {
    updateMutation.mutate({
      settings: {
        ...(shop?.settings || {}),
        notifications: notificationSettings,
      },
    });
  };

  const onReuploadPress = () => {
    Alert.alert('Re-upload', 'Mobile image re-upload will use this edit action.');
  };

  const tabs = useMemo(
    () => [
      { id: 'shop' as ShopTab, label: 'Shop Details', icon: Store },
      { id: 'media' as ShopTab, label: 'Shop Media', icon: Camera },
      { id: 'settings' as ShopTab, label: 'Settings', icon: Bell },
    ],
    [],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No shop selected yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topNav}>
          <View>
            <Text style={styles.navTitle}>Shop Details</Text>
            <Text style={styles.navSubtitle}>Manage shop essentials and media</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.7 }]}
            onPress={activeTab === 'settings' ? saveNotifications : saveShopDetails}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.saveWrap}>
                <Save size={14} color="#FFF" />
                <Text style={styles.saveBtnText}>SAVE</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Icon size={14} color={active ? Colors.primary : '#64748B'} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'shop' && (
            <View style={styles.section}>
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Users size={18} color={Colors.primary} />
                  <View>
                    <Text style={styles.statValue}>{staffRows.length}</Text>
                    <Text style={styles.statLabel}>Total Staff</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <MapPin size={18} color="#10B981" />
                  <View>
                    <Text style={styles.statValue}>{formData.workingTime}</Text>
                    <Text style={styles.statLabel}>Working Time</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionLabel}>SHOP DETAILS</Text>

              <TextInput style={styles.input} placeholder="Name" value={formData.name} onChangeText={t => setFormData({ ...formData, name: t })} />

              <View style={styles.selectWrap}>
                <Text style={styles.selectLabel}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {SHOP_TYPES.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeChip, formData.shopType === type && styles.typeChipActive]}
                      onPress={() => setFormData({ ...formData, shopType: type })}
                    >
                      <Text style={[styles.typeChipText, formData.shopType === type && styles.typeChipTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TextInput style={styles.input} placeholder="Phone" value={formData.phone} onChangeText={t => setFormData({ ...formData, phone: t })} />
              <TextInput style={styles.input} placeholder="Email" value={formData.email} onChangeText={t => setFormData({ ...formData, email: t })} />
              <TextInput style={styles.input} placeholder="Address" value={formData.address} onChangeText={t => setFormData({ ...formData, address: t })} />
              <TextInput style={styles.input} placeholder="City" value={formData.city} onChangeText={t => setFormData({ ...formData, city: t })} />
              <TextInput style={styles.input} placeholder="State" value={formData.state} onChangeText={t => setFormData({ ...formData, state: t })} />
              <TextInput style={styles.input} placeholder="Postal Code" value={formData.postalCode} onChangeText={t => setFormData({ ...formData, postalCode: t })} />
              <TextInput style={styles.input} placeholder="Location" value={formData.location} onChangeText={t => setFormData({ ...formData, location: t })} />
              
              <View style={styles.autofillContainer}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Google Link (Optional)" value={formData.googleMapLink} onChangeText={t => setFormData({ ...formData, googleMapLink: t })} />
                <TouchableOpacity 
                  style={[styles.autofillBtn, autofillMutation.isPending && { opacity: 0.6 }]}
                  onPress={handleAutofill}
                  disabled={autofillMutation.isPending}
                >
                  {autofillMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Globe size={14} color="#FFF" />
                      <Text style={styles.autofillBtnText}>Autofill</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput style={styles.input} placeholder="Timing (Working Time)" value={formData.workingTime} onChangeText={t => setFormData({ ...formData, workingTime: t })} />
            </View>
          )}

          {activeTab === 'media' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SHOP MEDIA</Text>

              <View style={styles.mediaCard}>
                <Image
                  source={{ uri: shop?.coverUrl || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1000' }}
                  style={styles.coverImage}
                />
                <TouchableOpacity style={styles.editIcon} onPress={onReuploadPress}>
                  <Pencil size={12} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.mediaLabel}>Cover Photo</Text>
              </View>

              <View style={styles.profilePhotoWrap}>
                <View style={styles.profilePhotoCard}>
                  <Image
                    source={{ uri: shop?.logoUrl || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400' }}
                    style={styles.profilePhoto}
                  />
                  <TouchableOpacity style={styles.editIconSmall} onPress={onReuploadPress}>
                    <Pencil size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.mediaLabel}>Shop Profile Photo</Text>
              </View>

              <View style={styles.galleryGrid}>
                {(shop?.photoUrls || []).map((url: string, index: number) => (
                  <View key={`${url}-${index}`} style={styles.galleryItem}>
                    <Image source={{ uri: url }} style={styles.galleryImage} />
                    <TouchableOpacity style={styles.editIconSmall} onPress={onReuploadPress}>
                      <Pencil size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'settings' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>

              {[
                { label: 'Booking confirmation', key: 'bookingConfirmation' },
                { label: 'Booking reminder', key: 'bookingReminder' },
                { label: 'Booking cancellation', key: 'bookingCancellation' },
                { label: 'Queue updates', key: 'queueUpdates' },
                { label: 'New booking', key: 'newBooking' },
                { label: 'Admin cancellation', key: 'adminCancellation' },
                { label: 'Daily summary', key: 'dailySummary' },
              ].map(item => (
                <View key={item.key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      notificationSettings[item.key] ? styles.toggleOn : styles.toggleOff,
                    ]}
                    onPress={() =>
                      setNotificationSettings(prev => ({
                        ...prev,
                        [item.key]: !prev[item.key],
                      }))
                    }
                  >
                    <View style={styles.toggleThumb} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 36 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontWeight: '700' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  navTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  navSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, ...Shadows.sm },
  saveWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  tabBtnActive: { borderColor: Colors.primary, backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 11, color: '#64748B', fontWeight: '800' },
  tabTextActive: { color: Colors.primary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  section: { marginTop: 12 },
  sectionLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 },
  statsCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 14 },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 10 },
  statValue: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 10, fontSize: 14, color: '#0F172A', fontWeight: '700' },
  selectWrap: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, marginBottom: 10 },
  selectLabel: { fontSize: 11, color: '#64748B', fontWeight: '800', marginBottom: 8 },
  autofillContainer: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'stretch' },
  autofillBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  autofillBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  typeChip: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: '#EEF2FF' },
  typeChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  typeChipTextActive: { color: Colors.primary },
  mediaCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  coverImage: { width: '100%', height: 170 },
  mediaLabel: { fontSize: 12, color: '#64748B', fontWeight: '800', padding: 10 },
  editIcon: { position: 'absolute', right: 10, bottom: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  profilePhotoWrap: { marginBottom: 16 },
  profilePhotoCard: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  profilePhoto: { width: '100%', height: '100%' },
  editIconSmall: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryItem: { width: 100, height: 100, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  galleryImage: { width: '100%', height: '100%' },
  toggleRow: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 52, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  toggle: { width: 42, height: 24, borderRadius: 999, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#10B981', alignItems: 'flex-end' },
  toggleOff: { backgroundColor: '#CBD5E1', alignItems: 'flex-start' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
});
