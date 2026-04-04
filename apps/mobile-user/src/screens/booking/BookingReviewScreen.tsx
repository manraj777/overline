import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import RazorpayCheckout from 'react-native-razorpay';
import { bookingsApi, paymentsApi, shopsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../../theme';
import { Divider, PrimaryButton } from '../../components/ui';
import { CreditCard, Store, Wallet } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { Config } from '../../config';

type RouteProps = RouteProp<RootStackParamList, 'BookingReview'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices, selectedDate, selectedTime, selectedStaffId } = route.params;

  const { user } = useAuthStore();
  const onlineOnly = Config.FEATURES.BOOKING_ONLINE_ONLY;
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'WALLET' | 'PAY_AT_SHOP'>(
    onlineOnly ? 'ONLINE' : 'PAY_AT_SHOP',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: shop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  const selectedServiceItems = useMemo(
    () => (shop?.services || []).filter((s: any) => selectedServices.includes(s.id)),
    [shop?.services, selectedServices],
  );

  const totalAmount = selectedServiceItems.reduce((sum: number, s: any) => sum + Number(s.price), 0);
  const startTime = `${selectedDate}T${selectedTime}:00`;

  const handleConfirm = async () => {
    if (user && !user.isPhoneVerified) {
      Alert.alert(
        'Phone Verification Required',
        'Please verify your phone number before booking. This helps prevent spam and ensures you receive booking updates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => navigation.goBack() },
        ],
      );
      return;
    }

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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Book Appointment</Text>
          <Text style={styles.stepSubtitle}>Step 4 of 4 • Review and pay</Text>
          <View style={styles.stepIndicator}>
            <View style={styles.step}><Text style={styles.stepText}>1</Text></View>
            <View style={styles.stepLineActive} />
            <View style={styles.step}><Text style={styles.stepText}>2</Text></View>
            <View style={styles.stepLineActive} />
            <View style={styles.step}><Text style={styles.stepText}>3</Text></View>
            <View style={styles.stepLineActive} />
            <View style={styles.step}><Text style={styles.stepText}>4</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{format(new Date(`${selectedDate}T00:00:00`), 'EEE, MMM d')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Professional</Text>
              <Text style={styles.summaryValue}>{selectedStaffId ? `Selected • ${selectedStaffId.slice(-4).toUpperCase()}` : 'Any available'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {!onlineOnly && (
              <TouchableOpacity
                style={[styles.paymentCard, paymentMethod === 'PAY_AT_SHOP' && styles.paymentCardSelected]}
                onPress={() => setPaymentMethod('PAY_AT_SHOP')}
                activeOpacity={0.85}
              >
                <Store color={paymentMethod === 'PAY_AT_SHOP' ? Colors.primary : Colors.textSecondary} size={18} />
                <View style={styles.paymentTextWrap}>
                  <Text style={styles.paymentTitle}>Pay at Shop</Text>
                  <Text style={styles.paymentSubtitle}>Pay after your service is complete</Text>
                </View>
              </TouchableOpacity>
            )}

            {!onlineOnly && (
              <TouchableOpacity
                style={[styles.paymentCard, paymentMethod === 'WALLET' && styles.paymentCardSelected]}
                onPress={() => setPaymentMethod('WALLET')}
                activeOpacity={0.85}
              >
                <Wallet color={paymentMethod === 'WALLET' ? Colors.primary : Colors.textSecondary} size={18} />
                <View style={styles.paymentTextWrap}>
                  <Text style={styles.paymentTitle}>Wallet</Text>
                  <Text style={styles.paymentSubtitle}>Use available wallet balance</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.paymentCard, paymentMethod === 'ONLINE' && styles.paymentCardSelected]}
              onPress={() => setPaymentMethod('ONLINE')}
              activeOpacity={0.85}
            >
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryShop}>{shop?.name}</Text>
            {selectedServiceItems.map((service: any) => (
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
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title={paymentMethod === 'ONLINE' ? 'Pay & Confirm' : 'Confirm Booking'}
          onPress={handleConfirm}
          loading={isSubmitting}
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
  stepHeader: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    ...Shadows.glow,
  },
  stepText: {
    color: '#fff',
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
  stepLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.primary,
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
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
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
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeights.medium,
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.md,
  },
});
