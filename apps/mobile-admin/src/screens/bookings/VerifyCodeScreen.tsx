import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {bookingsApi, dashboardApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Booking} from '../../types';
import {format} from 'date-fns';
import {CircleCheck, Play} from 'lucide-react-native';

export default function VerifyCodeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {selectedShopId} = useAuthStore();
  const [code, setCode] = useState(['', '', '', '']);
  const [verifiedBooking, setVerifiedBooking] = useState<Booking | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Fetch today's bookings to match verification codes
  const today = format(new Date(), 'yyyy-MM-dd');
  const {data: todayBookings = []} = useQuery<Booking[]>({
    queryKey: ['todayBookingsForVerify', selectedShopId],
    queryFn: () =>
      dashboardApi
        .getBookings(selectedShopId!, {date: today, limit: 100})
        .then(res => res.data?.bookings || res.data || []),
    enabled: !!selectedShopId,
  });

  const startMutation = useMutation({
    mutationFn: (bookingId: string) =>
      bookingsApi.updateStatus(bookingId, 'IN_PROGRESS'),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminBookings']});
      queryClient.invalidateQueries({queryKey: ['todayBookings']});
      queryClient.invalidateQueries({queryKey: ['dashboardStats']});
      Alert.alert('Success', 'Service started successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to start service',
      );
    },
  });

  const resetCode = () => {
    setCode(['', '', '', '']);
    setVerifiedBooking(null);
    inputRefs.current[0]?.focus();
  };

  const verifyCode = (fullCode: string) => {
    setIsVerifying(true);
    // Find booking with matching verification code from today's bookings
    const matchingBooking = todayBookings.find(
      (b: Booking) =>
        b.verificationCode === fullCode &&
        ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status),
    );

    if (matchingBooking) {
      Vibration.vibrate(100);
      setVerifiedBooking(matchingBooking);

      // Also call the verify-code endpoint on the backend
      bookingsApi
        .verifyCode(matchingBooking.id, fullCode)
        .catch(() => { /* verification code already matched client-side */ });
    } else {
      Vibration.vibrate([0, 100, 100, 100]);
      Alert.alert(
        'Invalid Code',
        'No active booking found with this code for today',
      );
      resetCode();
    }
    setIsVerifying(false);
  };

  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify when complete
    if (value && index === 3) {
      const fullCode = [...newCode.slice(0, 3), value].join('');
      if (fullCode.length === 4) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleStartService = () => {
    if (verifiedBooking) {
      startMutation.mutate(verifiedBooking.id);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#10B981',
    IN_PROGRESS: '#3B82F6',
  };

  return (
    <View style={styles.container}>
      {!verifiedBooking ? (
        <>
          {/* Code Entry */}
          <View style={styles.header}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              Ask the customer for their 4-digit code
            </Text>
          </View>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                ]}
                value={digit}
                onChangeText={value => handleCodeChange(value, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {isVerifying && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}

          <Text style={styles.hint}>
            The code is shown to customers after they book
          </Text>
        </>
      ) : (
        <>
          {/* Booking Found */}
          <View style={styles.successHeader}>
            <View style={styles.successIcon}>
              <CircleCheck size={34} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Code Verified!</Text>
          </View>

          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      (statusColors[verifiedBooking.status] || '#6B7280') + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        statusColors[verifiedBooking.status] || '#6B7280',
                    },
                  ]}>
                  {verifiedBooking.status.replace('_', ' ')}
                </Text>
              </View>
              <Text style={styles.bookingNumber}>
                {verifiedBooking.bookingNumber}
              </Text>
            </View>

            <View style={styles.customerSection}>
              <View style={styles.customerAvatar}>
                <Text style={styles.avatarText}>
                  {(verifiedBooking.user?.name || 'G').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.customerName}>
                  {verifiedBooking.user?.name || 'Guest'}
                </Text>
                {verifiedBooking.user?.phone && (
                  <Text style={styles.customerPhone}>
                    {verifiedBooking.user.phone}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.servicesSection}>
              <Text style={styles.sectionLabel}>Services</Text>
              {verifiedBooking.services?.map(service => (
                <View key={service.id} style={styles.serviceRow}>
                  <Text style={styles.serviceName}>{service.serviceName}</Text>
                  <Text style={styles.servicePrice}>₹{service.price}</Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₹{verifiedBooking.displayAmount}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            {verifiedBooking.status === 'IN_PROGRESS' ? (
              <View style={styles.inProgressNote}>
                <Play size={15} color="#3B82F6" style={styles.inProgressIcon} />
                <Text style={styles.inProgressText}>
                  Service is already in progress
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartService}
                disabled={startMutation.isPending}>
                {startMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.startButtonContent}>
                    <Play size={15} color="#fff" />
                    <Text style={styles.startButtonText}>Start Service</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.scanAgainButton} onPress={resetCode}>
              <Text style={styles.scanAgainText}>Enter Another Code</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  codeInput: {
    width: 64,
    height: 80,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  codeInputFilled: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 32,
  },
  successHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  bookingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingNumber: {
    fontSize: 13,
    color: '#6B7280',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  servicesSection: {},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 15,
    color: '#111827',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  actions: {
    gap: 12,
  },
  startButton: {
    backgroundColor: '#4F46E5',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanAgainButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanAgainText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '500',
  },
  inProgressNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 12,
  },
  inProgressIcon: {
    marginRight: 8,
  },
  inProgressText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
