import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { shopApi } from '../../api/client';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { 
  CreditCard, 
  Wallet, 
  CircleDollarSign, 
  Ticket, 
  Settings2, 
  ChevronRight,
  Info,
  ShieldCheck
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteProps = RouteProp<RootStackParamList, 'PayoutDetails'>;

export default function PayoutDetailsScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { selectedShopId } = useAuthStore();
  const shopId = (route.params as any)?.shopId || selectedShopId || '';

  const [settings, setSettings] = useState({
    upiId: '',
    allowCash: true,
    promoCode: '',
    extraCharge: '',
    revenueSplit: '70/30',
    platformFeeVisible: true
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payoutDetails', shopId],
    queryFn: () => shopApi.getPayoutDetails(shopId).then(res => res.data),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (data?.payoutDetails) {
      setSettings(data.payoutDetails);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => shopApi.updatePayoutDetails(shopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payoutDetails', shopId] });
      Alert.alert('Financial Registry Updated', 'Your payment preferences have been securely synchronized.');
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
            <Text style={styles.navTitle}>Payments</Text>
            <Text style={styles.navSubtitle}>Configure revenue receiving channels</Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={() => updateMutation.mutate(settings)}>
            <Text style={styles.saveBtnText}>SYNC</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DIGITAL SETTLEMENTS</Text>
            <View style={styles.inputCard}>
              <View style={styles.inputRow}>
                <Wallet size={20} color={Colors.primary} />
                <TextInput 
                  style={styles.input} 
                  placeholder="UPI ID (e.g. shopname@okicici)" 
                  value={settings.upiId}
                  onChangeText={t => setSettings({...settings, upiId: t})}
                />
              </View>
              <View style={styles.cardInfo}>
                <ShieldCheck size={12} color="#10B981" />
                <Text style={styles.infoText}>Direct settlements to this ID after platform fee deduction.</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SHOP FLOOR PAYMENTS</Text>
            <View style={styles.toggleCard}>
              <View style={styles.toggleInfo}>
                <CircleDollarSign size={20} color="#F59E0B" />
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.toggleTitle}>Cash on Shop</Text>
                  <Text style={styles.toggleSubtitle}>Allow customers to pay at your counter</Text>
                </View>
              </View>
              <Switch 
                value={settings.allowCash} 
                onValueChange={v => setSettings({...settings, allowCash: v})}
                trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REVENUE OPTIMIZATION</Text>
            
            <TouchableOpacity style={styles.configItem}>
              <View style={styles.configMain}>
                <View style={[styles.configIcon, { backgroundColor: '#F0F9FF' }]}>
                  <Ticket size={20} color="#0EA5E9" />
                </View>
                <View>
                  <Text style={styles.configTitle}>Active Promo Code</Text>
                  <Text style={styles.configValue}>{settings.promoCode}</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.configItem}>
              <View style={styles.configMain}>
                <View style={[styles.configIcon, { backgroundColor: '#F0FDF4' }]}>
                  <CreditCard size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.configTitle}>Revenue Split (Owner/Staff)</Text>
                  <Text style={styles.configValue}>{settings.revenueSplit} ratio</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          <View style={styles.notice}>
            <Info size={16} color="#64748B" />
            <Text style={styles.noticeText}>
              Platform fees are automatically calculated per booking. Detailed breakdown available in Earnings Analysis.
            </Text>
          </View>

          <View style={{ height: 40 }} />
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
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, ...Shadows.glow },
  saveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
  inputCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 40 },
  input: { flex: 1, marginLeft: 16, fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  infoText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  toggleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  toggleInfo: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  toggleSubtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  configItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  configMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  configIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  configTitle: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  configValue: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  notice: { flexDirection: 'row', gap: 12, backgroundColor: '#F1F5F9', padding: 20, borderRadius: 24 },
  noticeText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 18, fontWeight: '600' },
});
