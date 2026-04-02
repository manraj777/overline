import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRoute, RouteProp} from '@react-navigation/native';
import {format} from 'date-fns';
import {bookingsApi} from '../../api/client';
import {RootStackParamList, Booking} from '../../types';
import {CalendarDays, Check, Clock3, Phone, Play} from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'BookingDetail'>;

export default function BookingDetailScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const {bookingId} = route.params;

  const {data: booking, isLoading} = useQuery<Booking>({
    queryKey: ['adminBooking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId).then(res => res.data),
  });

  const startMutation = useMutation({
    mutationFn: () => bookingsApi.updateStatus(bookingId, 'IN_PROGRESS'),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminBooking', bookingId]});
      queryClient.invalidateQueries({queryKey: ['adminBookings']});
      queryClient.invalidateQueries({queryKey: ['todayBookings']});
      Alert.alert('Success', 'Service started');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to start service',
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingsApi.completeService(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminBooking', bookingId]});
      queryClient.invalidateQueries({queryKey: ['adminBookings']});
      queryClient.invalidateQueries({queryKey: ['todayBookings']});
      queryClient.invalidateQueries({queryKey: ['dashboardStats']});
      Alert.alert('Success', 'Service completed');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to complete service',
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => bookingsApi.cancelBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminBooking', bookingId]});
      queryClient.invalidateQueries({queryKey: ['adminBookings']});
      Alert.alert('Success', 'Booking cancelled');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to cancel booking',
      );
    },
  });

  const noShowMutation = useMutation({
    mutationFn: () => bookingsApi.markNoShow(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminBooking', bookingId]});
      queryClient.invalidateQueries({queryKey: ['adminBookings']});
      Alert.alert('Success', 'Marked as no-show');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to mark no-show',
      );
    },
  });

  const handleStart = () => {
    Alert.alert('Start Service', 'Start the service for this booking?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Start', onPress: () => startMutation.mutate()},
    ]);
  };

  const handleComplete = () => {
    Alert.alert('Complete Service', 'Mark this service as completed?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Complete', onPress: () => completeMutation.mutate()},
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(undefined),
      },
    ]);
  };

  const handleNoShow = () => {
    Alert.alert(
      'Mark No-Show',
      'Customer did not show up for this appointment?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark No-Show',
          style: 'destructive',
          onPress: () => noShowMutation.mutate(),
        },
      ],
    );
  };

  const handleCall = () => {
    if (booking?.user?.phone) {
      Linking.openURL(`tel:${booking.user.phone}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const isPending = booking.status === 'PENDING';
  const isConfirmed = booking.status === 'CONFIRMED';
  const isInProgress = booking.status === 'IN_PROGRESS';
  const canStart = isPending || isConfirmed;
  const canComplete = isInProgress;
  const canCancel = isPending || isConfirmed;
  const canMarkNoShow = isPending || isConfirmed;

  const statusColors: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#10B981',
    IN_PROGRESS: '#3B82F6',
    COMPLETED: '#10B981',
    CANCELLED: '#EF4444',
    NO_SHOW: '#6B7280',
  };

  const isActionLoading =
    startMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    noShowMutation.isPending;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {backgroundColor: statusColors[booking.status] || '#6B7280'},
        ]}>
        <Text style={styles.statusText}>{booking.status.replace('_', ' ')}</Text>
        <Text style={styles.bookingNumber}>{booking.bookingNumber}</Text>
      </View>

      {/* Verification Code */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Verification Code</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{booking.verificationCode}</Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.avatarText}>
                {(booking.user?.name || 'G').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{booking.user?.name || 'Guest'}</Text>
              {booking.user?.email && (
                <Text style={styles.customerDetail}>{booking.user.email}</Text>
              )}
            </View>
          </View>
          {booking.user?.phone && (
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <Phone size={16} color="#4F46E5" />
              <Text style={styles.callButtonText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <CalendarDays size={20} color="#6B7280" style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Clock3 size={20} color="#6B7280" style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {format(new Date(booking.startTime), 'h:mm a')} -{' '}
                {format(new Date(booking.endTime), 'h:mm a')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.card}>
          {booking.services?.map(service => (
            <View key={service.id} style={styles.serviceRow}>
              <View>
                <Text style={styles.serviceName}>{service.serviceName}</Text>
                <Text style={styles.serviceDuration}>
                  {service.durationMinutes} minutes
                </Text>
              </View>
              <Text style={styles.servicePrice}>₹{service.price}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Services Total</Text>
            <Text style={styles.paymentValue}>₹{booking.serviceAmount}</Text>
          </View>
          {Number(booking.freeCashUsed) > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Free Cash Used</Text>
              <Text style={styles.discountValue}>-₹{booking.freeCashUsed}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{booking.displayAmount}</Text>
          </View>
          <Text style={styles.paymentType}>
            {booking.paymentType === 'PAY_LATER' ? 'Pay at Store' : 'Online Payment'}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {booking.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {canStart && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            disabled={isActionLoading}>
            {startMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.actionButtonInner}>
                <Play size={14} color="#fff" />
                <Text style={styles.startButtonText}>Start Service</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {canComplete && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={isActionLoading}>
            {completeMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.actionButtonInner}>
                <Check size={14} color="#fff" />
                <Text style={styles.completeButtonText}>Complete Service</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.secondaryActions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isActionLoading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {canMarkNoShow && (
            <TouchableOpacity
              style={styles.noShowButton}
              onPress={handleNoShow}
              disabled={isActionLoading}>
              <Text style={styles.noShowButtonText}>No-Show</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusBanner: {
    padding: 24,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bookingNumber: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  codeSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 16,
  },
  codeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callButtonText: {
    color: '#4F46E5',
    fontWeight: '500',
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceName: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    color: '#111827',
  },
  discountValue: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  actionsSection: {
    padding: 16,
  },
  startButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  noShowButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6B7280',
    alignItems: 'center',
  },
  noShowButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
