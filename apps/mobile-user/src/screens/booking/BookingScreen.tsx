import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, addDays, isSameDay } from 'date-fns';
import RazorpayCheckout from 'react-native-razorpay';
import { shopsApi, bookingsApi, queueApi, paymentsApi } from '../../api/client';
import { RootStackParamList, TimeSlot } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton, Divider } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { Config } from '../../config';
import { CalendarX, CreditCard, Wallet, Store } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'Booking'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices = [] } = route.params;

  const { user } = useAuthStore();
  const onlineOnly = Config.FEATURES.BOOKING_ONLINE_ONLY;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'WALLET' | 'PAY_AT_SHOP'>(
    onlineOnly ? 'ONLINE' : 'PAY_AT_SHOP',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: shop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', shopId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      queueApi
        .getSlots(shopId, {
          date: format(selectedDate, 'yyyy-MM-dd'),
          serviceIds: selectedServices,
        })
        .then(res => res.data),
  });

  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  const selectedServiceItems = (shop?.services || []).filter((s: any) => selectedServices.includes(s.id));
  const totalAmount = selectedServiceItems.reduce((sum: number, s: any) => sum + Number(s.price), 0);

  const handleConfirm = async () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    // Check phone verification before booking
    if (user && !user.isPhoneVerified) {
      Alert.alert(
        'Phone Verification Required',
        'Please verify your phone number before booking. This helps prevent spam and ensures you receive booking updates.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Verify Now', onPress: () => navigation.goBack()},
        ],
      );
      return;
    }

    const startTime = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`;
    try {
      setIsSubmitting(true);
      const created = await bookingsApi.create({ shopId, serviceIds: selectedServices, startTime });
      const bookingId = created.data.id;

      if (paymentMethod !== 'PAY_AT_SHOP') {
        const order = await paymentsApi.createOrder({
          bookingId,
          amount: totalAmount,
          method: paymentMethod,
        });

        if (paymentMethod === 'ONLINE') {
          if (order.data?.method !== 'RAZORPAY') {
            throw new Error('Online payment is mandatory, but payment gateway is unavailable.');
          }

          const paymentData = await RazorpayCheckout.open({
            key: order.data.keyId,
            amount: order.data.amount,
            currency: order.data.currency || 'INR',
            order_id: order.data.orderId,
            name: 'Overline',
            description: order.data.bookingNumber || 'Booking payment',
            prefill: {
              name: user?.name,
              email: user?.email,
              contact: user?.phone,
            },
            theme: { color: Colors.primary },
          });

          await paymentsApi.verifyRazorpay({
            razorpay_order_id: paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
          });
        }
      }

      navigation.replace('BookingConfirmation', { bookingId });
    } catch (error: any) {
      Alert.alert(
        'Booking Failed',
        error?.response?.data?.message || 'Unable to complete booking right now. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots: TimeSlot[] = availability?.slots || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, styles.stepActive]}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, styles.stepActive]}>
            <Text style={styles.stepNumber}>
              2
            </Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, selectedTime ? styles.stepActive : undefined]}>
            <Text style={[styles.stepNumber, !selectedTime && { color: Colors.textTertiary }]}>3</Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}>
            {dateOptions.map(date => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                  activeOpacity={0.8}>
                  <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
                    {isToday ? 'Today' : format(date, 'EEE')}
                  </Text>
                  <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>
                    {format(date, 'd')}
                  </Text>
                  <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
                    {format(date, 'MMM')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a Time</Text>
          {loadingSlots ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginTop: 24 }}
            />
          ) : timeSlots.length === 0 ? (
            <View style={styles.noSlots}>
              <CalendarX color={Colors.textTertiary} size={48} />
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          ) : (
            <View style={styles.timeGrid}>
              {timeSlots.map(slot => {
                const isSelected = selectedTime === slot.time;
                return (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.timeSlot,
                      !slot.available && styles.timeSlotUnavailable,
                      isSelected && styles.timeSlotSelected,
                    ]}
                    onPress={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    activeOpacity={0.8}>
                    <Text
                      style={[
                        styles.timeText,
                        !slot.available && styles.timeTextUnavailable,
                        isSelected && styles.timeTextSelected,
                      ]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Payment Method */}
        {selectedTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {!onlineOnly && (
                <TouchableOpacity
                  style={[
                    styles.paymentCard,
                    paymentMethod === 'PAY_AT_SHOP' && styles.paymentCardSelected,
                  ]}
                  onPress={() => setPaymentMethod('PAY_AT_SHOP')}
                  activeOpacity={0.85}>
                  <Store color={paymentMethod === 'PAY_AT_SHOP' ? Colors.primary : Colors.textSecondary} size={18} />
                  <View style={styles.paymentTextWrap}>
                    <Text style={styles.paymentTitle}>Pay at Shop</Text>
                    <Text style={styles.paymentSubtitle}>Pay after your service is complete</Text>
                  </View>
                </TouchableOpacity>
              )}

              {!onlineOnly && (
                <TouchableOpacity
                  style={[
                    styles.paymentCard,
                    paymentMethod === 'WALLET' && styles.paymentCardSelected,
                  ]}
                  onPress={() => setPaymentMethod('WALLET')}
                  activeOpacity={0.85}>
                  <Wallet color={paymentMethod === 'WALLET' ? Colors.primary : Colors.textSecondary} size={18} />
                  <View style={styles.paymentTextWrap}>
                    <Text style={styles.paymentTitle}>Wallet</Text>
                    <Text style={styles.paymentSubtitle}>Use available wallet balance</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  paymentMethod === 'ONLINE' && styles.paymentCardSelected,
                ]}
                onPress={() => setPaymentMethod('ONLINE')}
                activeOpacity={0.85}>
                <CreditCard color={paymentMethod === 'ONLINE' ? Colors.primary : Colors.textSecondary} size={18} />
                <View style={styles.paymentTextWrap}>
                  <Text style={styles.paymentTitle}>Pay Online</Text>
                  <Text style={styles.paymentSubtitle}>
                    {onlineOnly ? 'Required for this booking' : 'Razorpay secure checkout'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Summary */}
        {shop && selectedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryShop}>{shop.name}</Text>
              {shop.services
                ?.filter((s: any) => selectedServices.includes(s.id))
                .map((service: any) => (
                  <View key={service.id} style={styles.summaryItem}>
                    <Text style={styles.summaryService}>{service.name}</Text>
                    <Text style={styles.summaryPrice}>₹{service.price}</Text>
                  </View>
                ))}
              <Divider />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalPrice}>₹{totalAmount}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryService}>Payment</Text>
                <Text style={styles.summaryPrice}>
                  {onlineOnly
                    ? 'Online (Required)'
                    : paymentMethod === 'PAY_AT_SHOP'
                    ? 'Pay at Shop'
                    : paymentMethod === 'WALLET'
                    ? 'Wallet'
                    : 'Online'}
                </Text>
              </View>
              <View style={styles.freeCashBadge}>
                <Text style={styles.freeCashIcon}>✨</Text>
                <Text style={styles.freeCashText}>
                  You'll earn Free Cash on this booking!
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={paymentMethod === 'ONLINE' ? 'Pay & Confirm' : 'Confirm Booking'}
          onPress={handleConfirm}
          loading={isSubmitting}
          disabled={!selectedTime}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing['4xl'],
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.glow,
  },
  stepNumber: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  dateList: {
    paddingRight: Spacing.lg,
  },
  dateCard: {
    width: 72,
    paddingVertical: Spacing.md,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.lg,
  },
  dateDay: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: FontWeights.medium,
  },
  dateDaySelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateNum: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  dateNumSelected: {
    color: '#fff',
  },
  dateMonth: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  dateMonthSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  noSlotsIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  noSlotsText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeSlot: {
    width: '23%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeSlotUnavailable: {
    opacity: 0.3,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.lg,
  },
  timeText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  timeTextUnavailable: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  timeTextSelected: {
    color: '#fff',
    fontWeight: FontWeights.bold,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethods: {
    gap: Spacing.md,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  paymentCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  paymentTextWrap: {
    flex: 1,
  },
  paymentTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  paymentSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  summaryShop: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryService: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryPrice: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryTotal: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  summaryTotalPrice: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  freeCashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  freeCashIcon: {
    fontSize: 16,
  },
  freeCashText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: FontWeights.medium,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
