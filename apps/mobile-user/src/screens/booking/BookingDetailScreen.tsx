import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { bookingsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows, BookingStatusConfig } from '../../theme';
import { PrimaryButton, Divider, Badge, GlassCard } from '../../components/ui';
import { Phone, Calendar, Clock, X } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { bookingId } = route.params;

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId).then(res => res.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Success', 'Booking cancelled successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!booking) {
    return <View style={styles.errorContainer}><Text style={styles.errorText}>Booking not found</Text></View>;
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);
  const isCompleted = booking.status === 'COMPLETED';
  const isCancelled = booking.status === 'CANCELLED';
  const config = BookingStatusConfig[booking.status] || { color: Colors.textTertiary, bg: Colors.surfaceLight, icon: '•' };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: config.bg }]}>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>{config.icon}</Text>
        <Text style={[styles.statusText, { color: config.color }]}>{booking.status.replace('_', ' ')}</Text>
        <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
      </View>

      {/* Verification Code */}
      {!isCompleted && !isCancelled && (
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Verification Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{booking.verificationCode}</Text>
          </View>
          <Text style={styles.codeHint}>Show this code at the shop to start your service</Text>
        </View>
      )}

      {/* Shop Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SHOP</Text>
        <GlassCard>
          <Text style={styles.shopName}>{booking.shop?.name}</Text>
          <Text style={styles.shopAddress}>{booking.shop?.address}</Text>
          {booking.shop?.phone && (
            <TouchableOpacity style={styles.callButton}>
              <Phone color={Colors.primary} size={16} style={{ marginRight: 6 }} />
              <Text style={styles.callButtonText}>{booking.shop.phone}</Text>
            </TouchableOpacity>
          )}
        </GlassCard>
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATE & TIME</Text>
        <GlassCard>
          <View style={styles.dtRow}>
            <Calendar color={Colors.textSecondary} size={24} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.dtLabel}>Date</Text>
              <Text style={styles.dtValue}>{format(new Date(booking.startTime), 'EEEE, MMM d, yyyy')}</Text>
            </View>
          </View>
          <View style={[styles.dtRow, { marginTop: 12 }]}>
            <Clock color={Colors.textSecondary} size={24} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.dtLabel}>Time</Text>
              <Text style={styles.dtValue}>
                {format(new Date(booking.startTime), 'h:mm a')} - {format(new Date(booking.endTime), 'h:mm a')}
              </Text>
            </View>
          </View>
        </GlassCard>
      </View>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SERVICES</Text>
        <GlassCard>
          {booking.services?.map((service: any) => (
            <View key={service.id} style={styles.serviceRow}>
              <View>
                <Text style={styles.serviceName}>{service.serviceName}</Text>
                <Text style={styles.serviceDuration}>{service.durationMinutes} min</Text>
              </View>
              <Text style={styles.servicePrice}>₹{service.price}</Text>
            </View>
          ))}
        </GlassCard>
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PAYMENT</Text>
        <GlassCard>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Subtotal</Text>
            <Text style={styles.payValue}>₹{booking.serviceAmount}</Text>
          </View>
          {Number(booking.freeCashAmount) > 0 && (
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Free Cash Earned</Text>
              <Text style={[styles.payValue, { color: Colors.success }]}>+₹{booking.freeCashAmount}</Text>
            </View>
          )}
          <Divider />
          <View style={styles.payRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{booking.displayAmount}</Text>
          </View>
          <Badge
            text={booking.paymentType === 'PAY_LATER' ? 'Pay at Store' : booking.paymentType}
            color={Colors.accent}
            size="md"
          />
        </GlassCard>
      </View>

      {/* Cancel */}
      {canCancel && (
        <View style={styles.section}>
          <PrimaryButton
            title="Cancel Booking"
            onPress={handleCancel}
            loading={cancelMutation.isPending}
            variant="danger"
            icon={<X color="#fff" size={20} />}
          />
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: FontSizes.lg, color: Colors.textSecondary },
  statusBanner: {
    padding: Spacing['2xl'], alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statusText: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 4 },
  bookingNumber: { fontSize: FontSizes.sm, color: Colors.textTertiary },
  codeSection: {
    backgroundColor: Colors.surface, padding: Spacing['2xl'], alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  codeLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  codeBox: {
    backgroundColor: Colors.primary, paddingHorizontal: 44, paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.xl, marginBottom: Spacing.sm, ...Shadows.glow,
  },
  codeText: { fontSize: 36, fontWeight: FontWeights.extrabold, color: '#fff', letterSpacing: 14 },
  codeHint: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: Colors.textTertiary,
    letterSpacing: 1.5, marginBottom: Spacing.md,
  },
  shopName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.textPrimary, marginBottom: 4 },
  shopAddress: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  callButton: {
    flexDirection: 'row',
    marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md, alignItems: 'center',
  },
  callButtonText: { color: Colors.primary, fontWeight: FontWeights.medium, fontSize: FontSizes.sm },
  dtRow: { flexDirection: 'row', alignItems: 'center' },
  dtLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: 2 },
  dtValue: { fontSize: FontSizes.md, fontWeight: FontWeights.medium, color: Colors.textPrimary },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  serviceName: { fontSize: FontSizes.md, color: Colors.textPrimary },
  serviceDuration: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  servicePrice: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.textPrimary },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  payLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  payValue: { fontSize: FontSizes.sm, color: Colors.textPrimary },
  totalLabel: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
  totalValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.extrabold, color: Colors.textPrimary },
});
