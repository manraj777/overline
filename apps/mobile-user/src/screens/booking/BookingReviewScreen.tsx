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
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingsApi, shopsApi, paymentsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Shadows, BorderRadius } from '../../theme';
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
  CreditCard,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';

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
  const [agreePolicies, setAgreePolicies] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

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

  // Travel Mode / Start Address States
  const [selectedStartLocation, setSelectedStartLocation] = useState<string>('current');
  const [travelMode, setTravelMode] = useState<'WALK' | 'VEHICLE'>('VEHICLE');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Noida/Delhi coordinates lookup
  const TEST_ADDRESS_COORDINATES: Record<string, { latitude: number; longitude: number }> = useMemo(() => ({
    '1': { latitude: 28.6289, longitude: 77.3797 }, // Noida Office
    '2': { latitude: 28.6304, longitude: 77.2177 }, // Delhi CP
  }), []);

  // Geodesic distance (Haversine formula)
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Load saved addresses and fetch current location coordinates
  useEffect(() => {
    async function loadAddresses() {
      try {
        const stored = await AsyncStorage.getItem('user_saved_addresses');
        if (stored) {
          setSavedAddresses(JSON.parse(stored));
        } else {
          setSavedAddresses([
            { id: '1', label: 'Office (Noida)', address: 'G-12, Sector 63, Noida, UP' },
            { id: '2', label: 'Home (Delhi)', address: '45, Connaught Place, New Delhi, DL' }
          ]);
        }
      } catch (_) {}
    }
    loadAddresses();

    async function fetchLocationSafely() {
      if (Platform.OS === 'android') {
        try {
          const { PermissionsAndroid } = require('react-native');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'We need access to your location to show travel ETA.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('[BookingReview] Location permission denied');
            return;
          }
        } catch (err) {
          console.warn('[BookingReview] Permission error:', err);
          return;
        }
      }

      try {
        Geolocation.getCurrentPosition(
          (pos) => {
            setCurrentCoords({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
          },
          (err) => console.log('[BookingReview] Error fetching location for travel calculations:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } catch (e) {
        console.warn('[BookingReview] Geolocation crash caught:', e);
      }
    }
    
    fetchLocationSafely();
  }, []);

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  const travelMetrics = useMemo(() => {
    if (!shop?.latitude || !shop?.longitude) return null;
    let startLat: number | null = null;
    let startLon: number | null = null;

    if (selectedStartLocation === 'current') {
      if (currentCoords) {
        startLat = currentCoords.latitude;
        startLon = currentCoords.longitude;
      }
    } else {
      const match = TEST_ADDRESS_COORDINATES[selectedStartLocation];
      if (match) {
        startLat = match.latitude;
        startLon = match.longitude;
      } else {
        startLat = shop.latitude + 0.03;
        startLon = shop.longitude + 0.03;
      }
    }

    if (startLat === null || startLon === null) return null;

    const distance = calculateHaversineDistance(startLat, startLon, shop.latitude, shop.longitude);
    const speed = travelMode === 'WALK' ? 5 : 30; // 5 km/h walking, 30 km/h driving
    const etaMinutes = Math.ceil((distance / speed) * 60) + 5; // 5 min prep time buffer

    return {
      distance: parseFloat(distance.toFixed(2)),
      etaMinutes
    };
  }, [selectedStartLocation, travelMode, currentCoords, shop, TEST_ADDRESS_COORDINATES]);

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
    if (!shop?.id || selectedServices.length === 0) {
      setPriceBreakdown(null);
      return;
    }
    let cancelled = false;
    setIsCalculatingPrice(true);
    bookingsApi
      .calculatePrice({
        shopId: shop.id,
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
  }, [shop?.id, selectedServices, appliedCoupon]);

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
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      let travelNotes = notes.trim();
      if (travelMetrics) {
        const modeLabel = travelMode === 'WALK' ? 'Walking' : 'Vehicle';
        const travelDetails = `[Travel Details - Mode: ${modeLabel}, Distance: ${travelMetrics.distance} km, Est. ETA: ${travelMetrics.etaMinutes} mins]`;
        travelNotes = travelNotes ? `${travelNotes}\n${travelDetails}` : travelDetails;
      }
      const created = await bookingsApi.create({
        shopId: shop!.id,
        serviceIds: selectedServices,
        startTime,
        staffId: selectedStaffId,
        offerCode: appliedCoupon || undefined,
        notes: travelNotes || undefined,
        ...(bookingForOther && guestName.trim()
          ? {
              customerName: guestName.trim(),
              customerPhone: guestPhone.trim() || undefined,
            }
          : {}),
      });

      // If grandTotal is greater than 0, create the payment order using the selected method
      if (grandTotal > 0) {
        try {
          const orderResponse = await paymentsApi.createOrder({
            bookingId: created.data.id,
            method: paymentMethod,
          });
          const order = orderResponse.data;

          if (paymentMethod === 'ONLINE') {
            if (order.method === 'RAZORPAY' && order.keyId) {
              const options = {
                description: 'Booking Appointment Payment',
                image: shop?.coverUrl || shop?.logoUrl || 'https://i.imgur.com/3g7A6cz.png',
                currency: order.currency || 'INR',
                key: order.keyId,
                amount: order.amount,
                name: shop?.name || 'Overline Booking',
                order_id: order.orderId,
                prefill: {
                  email: user?.email || '',
                  contact: user?.phone || '',
                  name: user?.name || '',
                },
                theme: { color: Colors.primary || '#0F172A' },
              };

              const response = await RazorpayCheckout.open(options);
              
              // Verify payment on backend
              await paymentsApi.verifyRazorpay({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
            }
          } else if (paymentMethod === 'WALLET') {
            Alert.alert(
              'Payment Successful',
              'Payment was successfully deducted from your wallet balance.',
            );
          } else if (paymentMethod === 'PAY_AT_SHOP') {
            // Pay-at-shop confirmed on backend successfully
          }
        } catch (payError: any) {
          Alert.alert(
            'Payment Failed',
            payError?.response?.data?.message || payError?.description || payError?.message || 'Payment failed. The booking has been created but requires payment.',
          );
          if (paymentMethod === 'ONLINE') {
            // Navigate to BookingConfirmation so booking is not lost, but payment shows failed
            navigation.replace('BookingConfirmation', { bookingId: created.data.id });
            return;
          }
        }
      }

      navigation.replace('BookingConfirmation', { bookingId: created.data.id });
    } catch (e: any) {
      Alert.alert(
        'Booking Error',
        e.response?.data?.message || e.message || 'The slot might have been taken just now.',
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
            <Image source={{ uri: shop?.coverUrl || shop?.coverPhotoUrl }} style={styles.shopImg} />
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

          {/* Travel Details Selector Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Travel Details & ETA</Text>
            <Text style={styles.sectionSubtitle}>Calculate estimated travel time to the shop</Text>

            <Text style={styles.fieldLabel}>STARTING FROM</Text>
            <View style={styles.addressSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.addressSelectBtn,
                  selectedStartLocation === 'current' && styles.addressSelectBtnActive,
                ]}
                onPress={() => setSelectedStartLocation('current')}
              >
                <MapPin size={16} color={selectedStartLocation === 'current' ? Colors.primary : '#64748B'} />
                <Text
                  style={[
                    styles.addressSelectText,
                    selectedStartLocation === 'current' && styles.addressSelectTextActive,
                  ]}
                >
                  Current
                </Text>
              </TouchableOpacity>

              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressSelectBtn,
                    selectedStartLocation === addr.id && styles.addressSelectBtnActive,
                  ]}
                  onPress={() => setSelectedStartLocation(addr.id)}
                >
                  <MapPin size={16} color={selectedStartLocation === addr.id ? Colors.primary : '#64748B'} />
                  <Text
                    style={[
                      styles.addressSelectText,
                      selectedStartLocation === addr.id && styles.addressSelectTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {addr.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>TRAVEL MODE</Text>
            <View style={styles.travelModeRow}>
              <TouchableOpacity
                style={[
                  styles.travelModeBtn,
                  travelMode === 'VEHICLE' && styles.travelModeBtnActive,
                ]}
                onPress={() => setTravelMode('VEHICLE')}
              >
                <Text
                  style={[
                    styles.travelModeText,
                    travelMode === 'VEHICLE' && styles.travelModeTextActive,
                  ]}
                >
                  🚗 Vehicle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.travelModeBtn,
                  travelMode === 'WALK' && styles.travelModeBtnActive,
                ]}
                onPress={() => setTravelMode('WALK')}
              >
                <Text
                  style={[
                    styles.travelModeText,
                    travelMode === 'WALK' && styles.travelModeTextActive,
                  ]}
                >
                  🚶 Walk
                </Text>
              </TouchableOpacity>
            </View>

            {travelMetrics ? (
              <View style={styles.etaDisplayCard}>
                <Clock size={16} color={Colors.primary} />
                <Text style={styles.etaDisplayText}>
                  Est. Travel:{' '}
                  <Text style={{ fontWeight: 'bold', color: Colors.primary }}>
                    {travelMetrics.distance} km
                  </Text>{' '}
                  ({travelMetrics.etaMinutes} mins)
                </Text>
              </View>
            ) : (
              <View style={styles.etaDisplayCard}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.etaDisplayText}>Calculating ETA...</Text>
              </View>
            )}
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
                style={[styles.methodBtn, styles.methodDisabled]}
                disabled={true}
              >
                <CreditCard size={18} color={Colors.textMuted || '#94A3B8'} />
                <View style={styles.disabledMethodRow}>
                  <Text style={[styles.methodText, styles.methodTextDisabled]}>Prepay Online</Text>
                  <Text style={styles.soonBadge}>SOON</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, styles.methodDisabled]}
                disabled={true}
              >
                <Wallet size={18} color={Colors.textMuted || '#94A3B8'} />
                <View style={styles.disabledMethodRow}>
                  <Text style={[styles.methodText, styles.methodTextDisabled]}>Wallet Credits</Text>
                  <Text style={styles.soonBadge}>SOON</Text>
                </View>
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

          {/* Policies Checkbox Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.policyRow}
              onPress={() => setAgreePolicies(v => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  agreePolicies && styles.checkboxActive,
                ]}
              >
                {agreePolicies && <CheckCircle2 size={14} color="#FFF" />}
              </View>
              <Text style={styles.policyText}>
                I agree to arrive <Text style={{ fontWeight: '900', color: '#0F172A' }}>10 minutes prior</Text> to my scheduled time and accept the{' '}
                <Text style={styles.policyLink} onPress={() => setShowPolicyModal(true)}>
                  Terms of Service
                </Text>{' '}
                &{' '}
                <Text style={styles.policyLink} onPress={() => setShowPolicyModal(true)}>
                  Privacy Policy
                </Text>.
              </Text>
            </TouchableOpacity>
          </View>

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
            <View style={[styles.trustBadge, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD', marginTop: 8 }]}>
              <Check size={12} color="#0284C7" />
              <Text style={[styles.trustText, { color: '#0284C7' }]}>ACCEPTS UPI & CASH AT SHOP</Text>
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
                (isSubmitting || hasActiveBookingOverlap || !agreePolicies) && { opacity: 0.5 },
              ]}
              onPress={handleConfirm}
              disabled={isSubmitting || hasActiveBookingOverlap || !agreePolicies}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.payBtnText}>
                    {hasActiveBookingOverlap ? 'BOOKING EXISTS' : 'TEST_CONFIRM'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>

      {/* Terms & Privacy Policies Modal */}
      <Modal visible={showPolicyModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms & Policies</Text>
            <TouchableOpacity onPress={() => setShowPolicyModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.policySectionTitle}>1. Mandatory Arrival Timing Policy</Text>
            <Text style={styles.policyBodyText}>
              To maintain the queue schedule and respect the time slots of other clients, you are required to arrive at the shop at least 10 minutes prior to your scheduled time. Late arrivals may result in slot forfeiture or rescheduling.
            </Text>

            <Text style={styles.policySectionTitle}>2. Platform Disclaimer & Shop Liability</Text>
            <Text style={styles.policyBodyText}>
              Overline is a tech platform connecting you with independent service providers. The service quality, timing, accuracy of menu listings, and actual pricing are the sole responsibility of the Shop. Overline is not responsible or liable for any misleading information, pricing discrepancies, or misguiding details ("misguide") listed by shops on our platform.
            </Text>

            <Text style={styles.policySectionTitle}>3. Privacy & Device Permissions</Text>
            <Text style={styles.policyBodyText}>
              Overline requests specific permissions to operate:
              {"\n"}• Location access: used to find nearby shops and display route navigation.
              {"\n"}• Camera & Photos access: used to upload profile avatars, service references, shop gallery photos, or completed review attachments.
              {"\n"}• Push Notifications: used to send real-time queue status alerts and booking confirmations.
              {"\n"}We do not share your private data with third parties or advertisers.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  policyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  policyLink: {
    color: Colors.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
  },
  policySectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 8,
  },
  policyBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  methodDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  disabledMethodRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'none',
  },
  soonBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.primary,
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    letterSpacing: 0.5,
  },
  addressSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  addressSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  addressSelectBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  addressSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    maxWidth: 120,
  },
  addressSelectTextActive: {
    color: Colors.primary,
  },
  travelModeRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  travelModeBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelModeBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  travelModeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  travelModeTextActive: {
    color: Colors.primary,
  },
  etaDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  etaDisplayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '600',
  },
});
