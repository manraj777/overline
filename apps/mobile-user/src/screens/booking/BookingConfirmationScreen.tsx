import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { bookingsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton, Divider } from '../../components/ui';
import { Check, Sparkles } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'BookingConfirmation'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId).then(res => res.data),
  });

  const goHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  if (!booking) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bgOrb} />

      <View style={styles.content}>
        {/* Success Animation */}
        <View style={styles.successCircle}>
          <View style={styles.successInner}>
            <Check color="#fff" size={40} />
          </View>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your appointment is all set</Text>

        {/* Booking Card */}
        <View style={styles.bookingCard}>
          <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shop</Text>
            <Text style={styles.detailValue}>{booking.shop?.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {format(new Date(booking.startTime), 'EEE, MMM d · h:mm a')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Services</Text>
            <Text style={styles.detailValue}>
              {booking.services?.map((s: any) => s.serviceName).join(', ')}
            </Text>
          </View>

          <Divider />

          {/* Verification Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Your Verification Code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{booking.verificationCode}</Text>
            </View>
            <Text style={styles.codeHint}>
              Show this code at the shop to begin
            </Text>
          </View>

          <Divider />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{booking.displayAmount}</Text>
          </View>

          {Number(booking.freeCashAmount) > 0 && (
            <View style={styles.freeCashBadge}>
              <Sparkles color={Colors.success} size={14} style={{ marginRight: 6 }} />
              <Text style={styles.freeCashText}>
                You'll earn ₹{booking.freeCashAmount} Free Cash!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          title="View Booking Details"
          onPress={() => navigation.replace('BookingDetail', { bookingId })}
        />
        <TouchableOpacity style={styles.homeButton} onPress={goHome}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgOrb: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0, 196, 140, 0.06)',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 60,
    alignItems: 'center',
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  successInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  successCheck: {
    fontSize: 32,
    color: '#fff',
    fontWeight: FontWeights.bold,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
  },
  bookingCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookingNumber: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    letterSpacing: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.lg,
  },
  codeSection: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  codeBox: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 36,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.glow,
  },
  codeText: {
    fontSize: 32,
    fontWeight: FontWeights.extrabold,
    color: '#fff',
    letterSpacing: 10,
  },
  codeHint: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
  freeCashBadge: {
    backgroundColor: Colors.successLight,
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  freeCashText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: FontWeights.medium,
  },
  footer: {
    padding: Spacing['2xl'],
    paddingBottom: 40,
  },
  homeButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  homeButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});
