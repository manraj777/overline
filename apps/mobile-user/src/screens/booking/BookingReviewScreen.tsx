import React, { useMemo, useState, useEffect } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi, shopsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Shadows } from '../../theme';
import {
  Store,
  Wallet,
  ChevronLeft,
  ShieldCheck,
  Info,
  Calendar,
  Clock,
  UserPlus,
  Ticket,
  ChevronRight,
  Zap,
  MapPin,
  Lock,
  CheckCircle2,
  X,
  Tag,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');
// Valid coupon codes — kept in sync with web cart and backend calculatePrice logic.
const VALID_COUPONS = ['OVERLINE10', 'OVERLINE20', 'WELCOME50'];

type RouteProps = RouteProp<RootStackParamList, 'BookingReview'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PriceBreakdown {
  subtotal: number;
  taxesAndCharges: number;
  discount: number;
  freeCashUsed: number;
  finalAmount: number;
  currency: string;
}

export default function BookingReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices, selectedDate, selectedTime, selectedStaffId } = route.params;

  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'WALLET' | 'PAY_AT_SHOP'>('PAY_AT_SHOP');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── New "web-cart parity" state ─────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [bookingForOther, setBookingForOther] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  // Pull my active bookings to detect overlap with the new slot.
  const { data: myBookingsResp } = useQuery({
    queryKey: ['my-bookings', 'all'],
    queryFn: () => bookingsApi.getMy().then(res => res.data),
    enabled: !!user,
  });

  const selectedServiceItems = useMemo(
    () => (shop?.services || []).filter((s: any) => selectedServices.includes(s.id)),
    [shop?.services, selectedServices],
  );

  const totalDurationMinutes = useMemo(
    () => selectedServiceItems.reduce((sum: number, s: any) => sum + Number(s.durationMinutes || 0), 0),
    [selectedServiceItems],
  );

  // ── Active-booking overlap detection (mirrors web cart) ────────────────
  const hasActiveBookingOverlap = useMemo(() => {
    const list = (myBookingsResp as any)?.data;
    if (!Array.isArray(list) || !selectedDate || !selectedTime || totalDurationMinutes === 0) {
      return false;
    }
    const newStart = new Date(`${selectedDate}T${selectedTime}:00`).getTime();
    const newEnd = newStart + totalDurationMinutes * 60 * 1000;

    return list.some((b: any) => {
      const active = ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'WAITLISTED', 'IN_PROGRESS', 'IN_SERVICE'];
      if (!active.includes(b.status)) return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return newStart < bEnd && bStart < newEnd;
    });
  }, [myBookingsResp, selectedDate, selectedTime, totalDurationMinutes]);

  // ── Fetch server-side price breakdown whenever inputs change ───────────
  useEffect(() => {
    if (!shopId || selectedServices.length === 0) {
      setPriceBreakdown(null);
      return;
    }
    let cancelled = false;
    setIsCalculatingPrice(true);
    bookingsApi
      .calculatePrice({
        shopId,
        serviceIds: selectedServices,
        offerCode: appliedCoupon || undefined,
      })
      .then(res => {
        if (!cancelled) setPriceBreakdown(res.data);
      })
      .catch(err => {
        if (!cancelled) {
          // Non-fatal — fall back to client-side total.
          console.warn('calculatePrice failed', err?.response?.data || err?.message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsCalculatingPrice(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, selectedServices, appliedCoupon]);

  // ── Derived totals (server values when available, client fallback) ─────
  const itemsTotal = selectedServiceItems.reduce(
    (sum: number, s: any) => sum + Number(s.price),
    0,
  );
  const subtotal = priceBreakdown?.subtotal ?? itemsTotal;
  const taxes = priceBreakdown?.taxesAndCharges ?? 0;
  const discount = priceBreakdown?.discount ?? 0;
  const freeCashUsed = priceBreakdown?.freeCashUsed ?? 0;
  const grandTotal = priceBreakdown?.finalAmount ?? itemsTotal;

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (!VALID_COUPONS.includes(code)) {
      setCouponError('Invalid coupon code');
      return;
    }
    setAppliedCoupon(code);
    setCouponError(null);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleConfirm = async () => {
    if (!user?.isPhoneVerified) {
      Alert.alert(
        'Verification Needed',
        'Please complete phone verification to confirm this booking.',
      );
      return;
    }

    if (hasActiveBookingOverlap) {
      Alert.alert(
        'Active Booking Exists',
        'You already have an active booking during this time window. Please pick a different time or cancel the existing one.',
      );
      return;
    }

    if (bookingForOther && !guestName.trim()) {
      Alert.alert('Guest Name Required', 'Please enter the guest name when booking for someone else.');
      return;
    }

    try {
      setIsSubmitting(true);
      const startTime = `${selectedDate}T${selectedTime}:00`;
      const created = await bookingsApi.create({
        shopId,
        serviceIds: selectedServices,
        startTime,
        staffId: selectedStaffId,
        offerCode: appliedCoupon || undefined,
        notes: notes.trim() || undefined,
        ...(bookingForOther && guestName.trim()
          ? {
              customerName: guestName.trim(),
              customerPhone: guestPhone.trim() || undefined,
            }
          : {}),
      });
      navigation.replace('BookingConfirmation', { bookingId: created.data.id });
    } catch (e: any) {
      Alert.alert(
        'Booking Error',
        e.response?.data?.message || 'The slot might have been taken just now.',
      );
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

          {/* Booking-for-someone-else toggle */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setBookingForOther(v => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  bookingForOther && styles.checkboxActive,
                ]}
              >
                {bookingForOther && <CheckCircle2 size={14} color="#FFF" />}
              </View>
              <View style={styles.toggleIconBubble}>
                <UserPlus size={16} color={Colors.primary} />
              </View>
              <Text style={styles.toggleLabel}>Booking for someone else?</Text>
            </TouchableOpacity>

            {bookingForOther && (
              <View style={styles.guestInputs}>
                <TextInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Guest name"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.textInput}
                />
                <TextInput
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  placeholder="Guest phone (optional)"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                  style={styles.textInput}
                />
              </View>
            )}

            <Text style={[styles.fieldLabel, { marginTop: bookingForOther ? 12 : 16 }]}>
              SPECIAL REQUESTS
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything we should know before you arrive?"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              style={[styles.textInput, styles.textArea]}
            />
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

          {/* Coupon Code */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>APPLY COUPON CODE</Text>
            {!appliedCoupon ? (
              <>
                <View style={styles.couponRow}>
                  <View style={styles.couponInputWrap}>
                    <Ticket size={14} color={Colors.textTertiary} style={styles.couponIcon} />
                    <TextInput
                      value={couponInput}
                      onChangeText={t => setCouponInput(t.toUpperCase())}
                      placeholder="ENTER CODE"
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="characters"
                      style={styles.couponInput}
                    />
                  </View>
                  <TouchableOpacity onPress={handleApplyCoupon} style={styles.couponBtn}>
                    <Text style={styles.couponBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                {couponError && (
                  <View style={styles.couponErrorBox}>
                    <AlertTriangle size={12} color="#DC2626" />
                    <Text style={styles.couponErrorText}>{couponError}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.couponAppliedBox}>
                <CheckCircle2 size={14} color={Colors.primary} />
                <Text style={styles.couponAppliedText}>Code {appliedCoupon} applied!</Text>
                <TouchableOpacity onPress={handleRemoveCoupon} style={{ marginLeft: 'auto' }}>
                  <X size={14} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Overlap warning */}
          {hasActiveBookingOverlap && (
            <View style={styles.warningCard}>
              <AlertTriangle size={16} color="#DC2626" />
              <Text style={styles.warningText}>
                You already have an active booking during this time window.
              </Text>
            </View>
          )}

          {/* Bill Breakout */}
          <View style={styles.billCard}>
            <View style={styles.billHeader}>
              <Text style={styles.billHeaderTitle}>Payment Summary</Text>
              {isCalculatingPrice ? (
                <ActivityIndicator size="small" color={Colors.textTertiary} />
              ) : (
                <Lock size={14} color="#94A3B8" />
              )}
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>
            {taxes > 0 && (
              <View style={styles.billRow}>
                <View style={styles.infoRow}>
                  <Text style={styles.billLabel}>Taxes & Charges</Text>
                  <Info size={10} color="#94A3B8" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.billValue}>₹{taxes}</Text>
              </View>
            )}
            {freeCashUsed > 0 && (
              <View style={styles.billRow}>
                <View style={styles.infoRow}>
                  <Tag size={11} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.billLabel, { color: Colors.primary, fontStyle: 'italic' }]}>
                    Welcome Bonus
                  </Text>
                </View>
                <Text style={[styles.billValue, { color: Colors.primary }]}>−₹{freeCashUsed}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#10B981' }]}>Coupon Discount</Text>
                <Text style={[styles.billValue, { color: '#10B981' }]}>−₹{discount}</Text>
              </View>
            )}
            <View style={styles.thickDivider} />
            <View style={styles.billRow}>
              <Text style={styles.grandLabel}>Amount Payable</Text>
              <Text style={styles.grandValue}>₹{grandTotal}</Text>
            </View>
          </View>

          <View style={styles.trustFooter}>
            <View style={styles.trustBadge}>
              <Zap size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.trustText}>FASTEST BOOKING GUARANTEED</Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Check-Out Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.floatingWrap}
          pointerEvents="box-none"
        >
          <View style={styles.floatingBar}>
            <View style={styles.priceMeta}>
              <Text style={styles.metaPrice}>₹{grandTotal}</Text>
              <Text style={styles.metaSub}>INCL. GST</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.payBtn,
                (isSubmitting || hasActiveBookingOverlap) && { opacity: 0.5 },
              ]}
              onPress={handleConfirm}
              disabled={isSubmitting || hasActiveBookingOverlap}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payBtnText}>
                    {hasActiveBookingOverlap ? 'BOOKING EXISTS' : 'CONFIRM BOOKING'}
                  </Text>
                  <ChevronRight size={20} color="#FFF" strokeWidth={3} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

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

  // ── Web-cart-parity additions ────────────────────────────────────────
  floatingWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  guestInputs: {
    marginTop: 16,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInputWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  couponIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  couponInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingLeft: 34,
    paddingRight: 12,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    letterSpacing: 0.5,
  },
  couponBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  couponErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  couponErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  couponAppliedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(70, 72, 212, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(70, 72, 212, 0.2)',
    borderRadius: 12,
    padding: 12,
  },
  couponAppliedText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
});
