import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { shopApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { 
  Store, 
  MapPin, 
  Link2, 
  Clock, 
  Camera, 
  ChevronRight, 
  Users, 
  Info,
  Globe,
  Navigation
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteProps = RouteProp<RootStackParamList, 'ShopSettings'>;
const { width } = Dimensions.get('window');

export default function ShopSettingsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { selectedShopId } = useAuthStore();
  const shopId = (route.params as any)?.shopId || selectedShopId || '';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    googleLink: '', // New field
    type: 'SALON', // Category
  });

  const { data: shop, isLoading } = useQuery({
    queryKey: ['adminShop', shopId],
    queryFn: () => shopApi.getById(shopId).then(res => res.data),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        description: shop.description || '',
        address: shop.address || '',
        city: shop.city || '',
        phone: shop.phone || '',
        googleLink: shop.googlePlaceId || '',
        type: shop.type || 'SALON',
      });
    }
  }, [shop]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => shopApi.updateSettings(shopId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminShop', shopId] });
      Alert.alert('Success', 'Business profiles synchronized.');
    },
  });

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
        <Text style={{color: Colors.textSecondary, fontWeight: '700'}}>No shop selected yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.topNav}>
          <View>
            <Text style={styles.navTitle}>Shop Profile</Text>
            <Text style={styles.navSubtitle}>Establish your brand identity</Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={() => updateMutation.mutate(formData)}>
            <Text style={styles.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Shop Photo Section */}
          <TouchableOpacity style={styles.photoContainer}>
            <Image 
              source={{ uri: shop?.coverUrl || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1000' }} 
              style={styles.coverImage} 
            />
            <View style={styles.photoOverlay}>
              <View style={styles.cameraIcon}>
                <Camera size={20} color="#FFF" />
              </View>
              <Text style={styles.photoHint}>Upldate Shop Photo</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BASIC IDENTITY</Text>
            
            <View style={styles.inputWrap}>
              <Store size={18} color="#94A3B8" />
              <TextInput 
                style={styles.input} 
                value={formData.name} 
                onChangeText={t => setFormData({ ...formData, name: t })} 
                placeholder="Business Name"
              />
            </View>

            <View style={styles.inputWrap}>
              <Info size={18} color="#94A3B8" />
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                value={formData.description} 
                onChangeText={t => setFormData({ ...formData, description: t })} 
                placeholder="Brief details about your shop..."
                multiline
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GEOGRAPHIC DISCOVERY</Text>
            
            <View style={styles.inputWrap}>
              <MapPin size={18} color="#94A3B8" />
              <TextInput 
                style={styles.input} 
                value={formData.address} 
                onChangeText={t => setFormData({ ...formData, address: t })} 
                placeholder="Full Street Address"
              />
            </View>

            <View style={styles.inputWrap}>
              <Link2 size={18} color="#94A3B8" />
              <TextInput 
                style={styles.input} 
                value={formData.googleLink} 
                onChangeText={t => setFormData({ ...formData, googleLink: t })} 
                placeholder="Google Maps Link (Optional)"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OPERATIONS & TIMING</Text>
            
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Users size={20} color={Colors.primary} />
                <View>
                  <Text style={styles.statVal}>{shop?.staff?.length || 0}</Text>
                  <Text style={styles.statLabel}>Total Staff</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Globe size={20} color="#10B981" />
                <View>
                  <Text style={styles.statVal}>UTC +5:30</Text>
                  <Text style={styles.statLabel}>IST Region</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.timingTrigger}
              onPress={() => navigation.navigate('WorkingHours', {shopId})}
            >
              <View style={styles.timingInfo}>
                <Clock size={18} color="#64748B" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.timingTitle}>Operational Hours</Text>
                  <Text style={styles.timingSubtitle}>Currently: 09:00 AM - 09:00 PM (IST)</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  navTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  navSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  saveBtn: { backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  photoContainer: { width: '100%', height: 200, borderRadius: 30, overflow: 'hidden', marginBottom: 32, ...Shadows.md },
  coverImage: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  photoHint: { color: '#FFF', fontSize: 12, fontWeight: '800', marginTop: 12 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, height: 56, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  input: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700', color: '#1E293B', height: '100%' },
  statsCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statVal: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  divider: { width: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  timingTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  timingInfo: { flexDirection: 'row', alignItems: 'center' },
  timingTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  timingSubtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
});
