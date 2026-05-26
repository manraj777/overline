import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { bookingsApi } from '../../api/client';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton, Divider } from '../../components/ui';
import { Check, Sparkles, Zap, Timer, ArrowRight } from 'lucide-react-native';
import { useQueueBookingRealtime } from '../../hooks/useQueueBookingRealtime';
import { SoundManager } from '../../utils/SoundManager';

type RouteProps = RouteProp<RootStackParamList, 'BookingConfirmation'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingConfirmationScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId).then(res => res.data),
  });

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

  React.useEffect(() => {
    if (booking?.status === 'PENDING_APPROVAL' || booking?.status === 'PENDING') {
      SoundManager.playPending();
    }
  }, [booking?.status]);

  const goHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  if (!booking) return null;

  const isStarted = booking.status === 'IN_SERVICE';
  const isPending = booking.status === 'PENDING_APPROVAL' || booking.status === 'PENDING';

  return (
    <View style={styles.container}>
      <View style={[styles.bgOrb, isStarted && { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]} />

      <View style={styles.content}>
        {/* Success / Live Animation */}
        <View style={[styles.successCircle, isStarted && styles.liveCircle]}>
          <View style={[styles.successInner, isStarted && styles.liveInner]}>
            {isStarted ? (
              <Timer color="#fff" size={40} />
            ) : (
              <Check color="#fff" size={40} />
            )}
          </View>
        </View>

        <Text style={styles.title}>
          {isStarted ? 'Service Live!' : isPending ? 'Booking Placed!' : 'Booking Confirmed!'}
        </Text>
        <Text style={styles.subtitle}>
          {isStarted 
            ? 'Your session has officially started' 
            : isPending 
              ? 'Your booking request has been sent for approval.' 
              : 'Your appointment is all set'}
        </Text>

        {/* Booking Card */}
        <View style={[styles.bookingCard, isStarted && styles.liveBookingCard]}>
          {!isStarted && <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>}
          
          {isStarted && (
            <View style={styles.liveStatusRow}>
              <Zap size={14} color={Colors.primary} fill={Colors.primary} />
              <Text style={styles.liveStatusText}>ACTIVITY IN PROGRESS</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shop</Text>
            <Text style={styles.detailValue}>{booking.shop?.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Shift Specialist</Text>
            <Text style={styles.detailValue}>{booking.staff?.name || 'Assigned Specialist'}</Text>
          </View>

          <Divider />

          {/* Verification Code or Live Progress */}
          {!isStarted ? (
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>Show this to Specialist</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{booking.verificationCode}</Text>
              </View>
              <Text style={styles.codeHint}>
                Scan this at the shop to begin your session
              </Text>
            </View>
          ) : (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '30%' }]} />
              </View>
              <Text style={styles.progressHint}>Specialist is now providing your service</Text>
            </View>
          )}

          <Divider />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{booking.displayAmount}</Text>
          </View>

          {Number(booking.freeCashAmount) > 0 && !isStarted && (
            <View style={styles.freeCashBadge}>
              <Sparkles color={Colors.success} size={14} style={{ marginRight: 6 }} />
              <Text style={styles.freeCashText}>
                You'll earn ₹{booking.freeCashAmount} Credits!
              </Text>
            </View>
          ) || isStarted && (
            <View style={styles.secureBadge}>
              <Check color={Colors.primary} size={14} style={{ marginRight: 6 }} />
              <Text style={styles.secureText}>Session Verified & Secure</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          title={isStarted ? "View Progress Detail" : "View Booking Record"}
          onPress={() => navigation.replace('BookingDetail', { bookingId })}
          icon={<ArrowRight color="#FFF" size={18} />}
        />
        <TouchableOpacity style={styles.homeButton} onPress={goHome}>
          <Text style={styles.homeButtonText}>Return to Explorer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bgOrb: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0, 196, 140, 0.08)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  liveCircle: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  successInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  liveInner: {
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 40,
    fontWeight: '500',
  },
  bookingCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.md,
  },
  liveBookingCard: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: '#F8FAFC',
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  bookingNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  codeSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    marginBottom: 12,
    ...Shadows.lg,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressSection: {
    paddingVertical: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  freeCashBadge: {
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  freeCashText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },
  secureBadge: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secureText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  homeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  homeButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});
