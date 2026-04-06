import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi, paymentsApi, shopsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, FontWeights, Shadows, BorderRadius, Spacing, FontSizes } from '../../theme';
import {
  CreditCard,
  Store,
  Wallet,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Info,
  Calendar,
  Clock,
  User,
  Ticket,
  ChevronRight,
  Sparkles,
  Zap,
  MapPin,
  Lock
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { Config } from '../../config';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type RouteProps = RouteProp<RootStackParamList, 'BookingReview'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices, selectedDate, selectedTime, selectedStaffId } = route.params;

  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'WALLET' | 'PAY_AT_SHOP'>('PAY_AT_SHOP');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  const selectedServiceItems = useMemo(
    () => (shop?.services || []).filter((s: any) => selectedServices.includes(s.id)),
    [shop?.services, selectedServices],
  );

  const itemsTotal = selectedServiceItems.reduce((sum: number, s: any) => sum + Number(s.price), 0);
  const platformFee = 9.00;
  const grandTotal = itemsTotal + platformFee;

  const handleConfirm = async () => {
    if (!user?.isPhoneVerified) {
      Alert.alert('Verification Needed', 'Please complete phone verification to confirm this booking.');
      return;
    }

    try {
      setIsSubmitting(true);
      const startTime = `${selectedDate}T${selectedTime}:00`;
      const created = await bookingsApi.create({ shopId, serviceIds: selectedServices, startTime });
      navigation.replace('BookingConfirmation', { bookingId: created.data.id });
    } catch (e: any) {
      Alert.alert('Booking Error', e.response?.data?.message || 'The slot might have been taken just now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingShop) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Review Booking</Text>
            <View style={styles.headerBadge}>
              <ShieldCheck size={10} color="#10B981" fill="#10B981" />
              <Text style={styles.headerBadgeText}>SECURED</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Shop Card */}
          <View style={styles.shopSection}>
            <Image source={{ uri: shop?.coverPhotoUrl }} style={styles.shopImg} />
            <View style={styles.shopOverlay}>
              <Text style={styles.shopName}>{shop?.name}</Text>
              <View style={styles.addrRow}>
                <MapPin size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.shopAddr}>{shop?.address || 'Sector 62, Noida Area'}</Text>
              </View>
            </View>
          </View>

          {/* Slot Breakdown */}
          <View style={styles.slotContainer}>
            <View style={styles.slotBlock}>
              <Calendar size={18} color={Colors.primary} />
              <View>
                <Text style={styles.slotLabel}>DATE</Text>
                <Text style={styles.slotValue}>{format(new Date(selectedDate), 'EEE, d MMM')}</Text>
              </View>
            </View>
            <View style={styles.slotDivider} />
            <View style={styles.slotBlock}>
              <Clock size={18} color={Colors.primary} />
              <View>
                <Text style={styles.slotLabel}>TIME</Text>
                <Text style={styles.slotValue}>{selectedTime}</Text>
              </View>
            </View>
          </View>

          {/* Itemized List */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Service Package</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedServiceItems.length}</Text>
              </View>
            </View>
            {selectedServiceItems.map((s: any) => (
              <View key={s.id} style={styles.itemRow}>
                <View style={styles.itemLead}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemName}>{s.name}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{s.price}</Text>
              </View>
            ))}
          </View>

          {/* Payment Method Selector */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Method</Text>
            <View style={styles.methodList}>
              <TouchableOpacity 
                style={[styles.methodBtn, paymentMethod === 'PAY_AT_SHOP' && styles.methodActive]} 
                onPress={() => setPaymentMethod('PAY_AT_SHOP')}
              >
                <Store size={18} color={paymentMethod === 'PAY_AT_SHOP' ? Colors.primary : Colors.textTertiary} />
                <Text style={[styles.methodText, paymentMethod === 'PAY_AT_SHOP' && styles.methodTextActive]}>Pay at Shop</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.methodBtn, paymentMethod === 'WALLET' && styles.methodActive]} 
                onPress={() => setPaymentMethod('WALLET')}
              >
                <Wallet size={18} color={paymentMethod === 'WALLET' ? Colors.primary : Colors.textTertiary} />
                <Text style={[styles.methodText, paymentMethod === 'WALLET' && styles.methodTextActive]}>Wallet Credits</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bill Breakout */}
          <View style={styles.billCard}>
            <View style={styles.billHeader}>
              <Text style={styles.billHeaderTitle}>Payment Summary</Text>
              <Lock size={14} color="#94A3B8" />
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total</Text>
              <Text style={styles.billValue}>₹{itemsTotal}</Text>
            </View>
            <View style={styles.billRow}>
              <View style={styles.infoRow}>
                <Text style={styles.billLabel}>Platform Convenience</Text>
                <Info size={10} color="#94A3B8" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.billValue}>₹{platformFee}</Text>
            </View>
            <View style={styles.thickDivider} />
            <View style={styles.billRow}>
              <Text style={styles.grandLabel}>Amount Payable</Text>
              <Text style={styles.grandValue}>₹{grandTotal}</Text>
            </View>
          </View>

          <View style={styles.trustFooter}>
            <View style={styles.trustBadge}>
              <Zap size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.trustText}>FASTEST BOOKING GURANTEED</Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Check-Out Bar */}
        <View style={styles.floatingBar}>
          <View style={styles.priceMeta}>
            <Text style={styles.metaPrice}>₹{grandTotal}</Text>
            <Text style={styles.metaSub}>INCL. GST</Text>
          </View>
          <TouchableOpacity 
            style={[styles.payBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.payBtnText}>CONFIRM BOOKING</Text>
                <ChevronRight size={20} color="#FFF" strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  scroll: {
    padding: 20,
  },
  shopSection: {
    height: 140,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 20,
  },
  shopImg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  shopOverlay: {
    padding: 20,
    marginTop: 'auto',
  },
  shopName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  shopAddr: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  slotContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    ...Shadows.sm,
  },
  slotBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  slotDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  slotLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  slotValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  methodList: {
    marginTop: 16,
    gap: 12,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  methodActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  methodTextActive: {
    color: Colors.primary,
  },
  billCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  billHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  billValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  thickDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  grandLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  trustFooter: {
    alignItems: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  trustText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    height: 80,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    ...Shadows.lg,
  },
  priceMeta: {
    // Info
  },
  metaPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  metaSub: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
});
