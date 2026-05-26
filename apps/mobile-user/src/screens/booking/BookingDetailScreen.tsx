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
import { useQueueBookingRealtime } from '../../hooks/useQueueBookingRealtime';
import { SoundManager } from '../../utils/SoundManager';

type RouteProps = RouteProp<RootStackParamList, 'BookingDetail'>;

const WELLNESS_TIPS = [
  "💇‍♂️ Trimming your hair every 6-8 weeks helps prevent split ends and makes it look thicker and healthier.",
  "💧 Washing your hair with cool water helps seal the cuticles, trapping moisture and adding a natural shine.",
  "🧔 Beard oil works best when applied right after a shower, as warm water opens up the skin pores to absorb the nutrients.",
  "🧴 Use sunscreen with at least SPF 30 every single day, even when it's cloudy, to protect your skin from premature aging.",
  "💆‍♂️ A scalp massage increases blood flow, which stimulates hair follicles and promotes natural hair growth.",
  "🧖‍♂️ Using a charcoal face mask once a week draws out impurities, dirt, and excess oil from deep inside your pores.",
  "🌿 Drinking at least 3 liters of water daily hydrates your hair roots and keeps your skin clear and glowing.",
  "🥝 Foods rich in Vitamin C (like oranges, strawberries, and kiwis) boost collagen production, which strengthens hair strands.",
  "💤 Silk or satin pillowcases reduce friction on your hair and skin, preventing bedhead, frizz, and sleep wrinkles.",
  "🧼 Clean your hairbrush and grooming tools weekly to avoid transferring dust, oils, and bacteria back onto your clean hair."
];

export default function BookingDetailScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { bookingId } = route.params;

  // Real-time status sync
  useQueueBookingRealtime({
    bookingId,
    onBookingUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      
      const newStatus = payload.status;
      if (newStatus === 'CONFIRMED') {
        SoundManager.playConfirmed();
      } else if (newStatus === 'IN_SERVICE') {
        SoundManager.playStart();
      } else if (newStatus === 'COMPLETED') {
        SoundManager.playCompleted();
      }
    }
  });

  const [breathState, setBreathState] = React.useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [tipIndex, setTipIndex] = React.useState(0);
  const [boredomTab, setBoredomTab] = React.useState<'tip' | 'breath'>('tip');

  React.useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count = (count + 1) % 3;
      if (count === 0) setBreathState('Inhale');
      else if (count === 1) setBreathState('Hold');
      else setBreathState('Exhale');
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Boredom Buster Widget */}
      {!isCompleted && !isCancelled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WAITING ROOM BOREDOM BUSTER 🧘‍♂️</Text>
          <View style={styles.busterCard}>
            <View style={styles.busterTabs}>
              <TouchableOpacity
                style={[styles.busterTab, boredomTab === 'tip' && styles.busterTabActive]}
                onPress={() => setBoredomTab('tip')}
              >
                <Text style={[styles.busterTabText, boredomTab === 'tip' && styles.busterTabTextActive]}>Self-Care Tip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.busterTab, boredomTab === 'breath' && styles.busterTabActive]}
                onPress={() => setBoredomTab('breath')}
              >
                <Text style={[styles.busterTabText, boredomTab === 'breath' && styles.busterTabTextActive]}>Mindful Breath</Text>
              </TouchableOpacity>
            </View>

            {boredomTab === 'tip' ? (
              <View style={styles.busterContent}>
                <Text style={styles.busterQuote}>{WELLNESS_TIPS[tipIndex]}</Text>
                <TouchableOpacity
                  style={styles.newTipBtn}
                  onPress={() => setTipIndex(prev => (prev + 1) % WELLNESS_TIPS.length)}
                >
                  <Text style={styles.newTipText}>Next Tip ⚡</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.busterContentCenter}>
                <View style={[
                  styles.breathCircle,
                  breathState === 'Inhale' && styles.breathCircleExpand,
                  breathState === 'Hold' && styles.breathCircleHold,
                  breathState === 'Exhale' && styles.breathCircleShrink,
                ]}>
                  <Text style={styles.breathText}>{breathState}</Text>
                </View>
                <Text style={styles.breathSubText}>
                  {breathState === 'Inhale' && 'Breathe in slowly through your nose...'}
                  {breathState === 'Hold' && 'Hold your breath and relax...'}
                  {breathState === 'Exhale' && 'Release the breath and let go of tension...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

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
  busterCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  busterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  busterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  busterTabActive: {
    backgroundColor: Colors.primary,
    ...Shadows.glow,
  },
  busterTabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  busterTabTextActive: {
    color: '#fff',
    fontWeight: FontWeights.bold,
  },
  busterContent: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  busterContentCenter: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busterQuote: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  newTipBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newTipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  breathCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryGhost,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  breathCircleExpand: {
    transform: [{ scale: 1.15 }],
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  breathCircleHold: {
    transform: [{ scale: 1.15 }],
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: Colors.success,
  },
  breathCircleShrink: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  breathText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
  breathSubText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: FontWeights.medium,
    height: 20,
  },
});
