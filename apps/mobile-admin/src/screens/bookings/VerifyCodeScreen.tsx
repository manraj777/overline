import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {bookingsApi, dashboardApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Booking} from '../../types';
import {format} from 'date-fns';
import {
  CheckCircle2,
  Play,
  X,
  Keyboard as KeyboardIcon,
  User,
  Clock,
  ShieldCheck,
  ChevronRight,
  RefreshCcw
} from 'lucide-react-native';

const {width} = Dimensions.get('window');

export default function VerifyCodeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {selectedShopId} = useAuthStore();
  const [digits, setDigits] = useState<string[]>([]);
  const [verifiedBooking, setVerifiedBooking] = useState<Booking | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Fetch today's bookings
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
      Alert.alert('Success', 'Service started successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start service');
    },
  });

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (val: string) => {
    if (digits.length < 4) {
      const next = [...digits, val];
      setDigits(next);
      if (next.length === 4) {
        verifyCode(next.join(''));
      }
    }
  };

  const handleDelete = () => {
    setDigits(digits.slice(0, -1));
  };

  const verifyCode = (fullCode: string) => {
    setIsVerifying(true);
    const matchingBooking = todayBookings.find(
      (b: Booking) =>
        b.verificationCode === fullCode &&
        ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status),
    );

    setTimeout(() => {
      if (matchingBooking) {
        Vibration.vibrate(100);
        setVerifiedBooking(matchingBooking);
        bookingsApi.verifyCode(matchingBooking.id, fullCode).catch(() => {});
      } else {
        Vibration.vibrate([0, 100, 100, 100]);
        shake();
        Alert.alert('Invalid Code', 'No matching booking for today.');
        setDigits([]);
      }
      setIsVerifying(false);
    }, 600);
  };

  const reset = () => {
    setDigits([]);
    setVerifiedBooking(null);
  };

  const Keypad = () => (
    <View style={styles.keypad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <TouchableOpacity key={num} style={styles.key} onPress={() => handleKeyPress(num.toString())}>
          <Text style={styles.keyText}>{num}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.key} />
      <TouchableOpacity style={styles.key} onPress={() => handleKeyPress('0')}>
        <Text style={styles.keyText}>0</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.key} onPress={handleDelete}>
        <X size={24} color="#0F172A" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <X size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Check-in</Text>
          <View style={{width: 44}} />
        </View>

        {!verifiedBooking ? (
          <View style={styles.entryView}>
            <View style={styles.instruction}>
              <KeyboardIcon size={32} color="#3B82F6" />
              <Text style={styles.instructionTitle}>Enter Customer Code</Text>
              <Text style={styles.instructionDesc}>Ask the customer for the 4-digit code shown in their app</Text>
            </View>

            <Animated.View style={[styles.digitsRow, {transform: [{translateX: shakeAnim}]}]}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[styles.digitBox, digits[i] ? styles.digitBoxActive : null]}>
                  <Text style={styles.digitText}>{digits[i] || ''}</Text>
                  {!digits[i] && <View style={styles.digitDot} />}
                </View>
              ))}
            </Animated.View>

            {isVerifying ? (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator color="#3B82F6" />
                <Text style={styles.verifyingText}>Searching Bookings...</Text>
              </View>
            ) : <View style={{height: 60}} />}

            <Keypad />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.successView}>
            <View style={styles.successBadge}>
              <CheckCircle2 size={64} color="#10B981" />
              <Text style={styles.successTitle}>Verified Successfully</Text>
            </View>

            <View style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>CONFIRMED</Text>
                </View>
                <Text style={styles.bookingID}>#{verifiedBooking.bookingNumber}</Text>
              </View>

              <View style={styles.userRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{verifiedBooking.user?.name?.charAt(0) || 'G'}</Text>
                </View>
                <View>
                  <Text style={styles.userName}>{verifiedBooking.user?.name || 'Guest Customer'}</Text>
                  <Text style={styles.userPhone}>{verifiedBooking.user?.phone || 'No phone provided'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Clock size={16} color="#64748B" />
                  <Text style={styles.detailText}>{verifiedBooking.startTime ? format(new Date(verifiedBooking.startTime), 'hh:mm a') : 'TBD'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <ShieldCheck size={16} color="#64748B" />
                  <Text style={styles.detailText}>Secure Pay</Text>
                </View>
              </View>

              <View style={styles.servicesList}>
                {verifiedBooking.services?.map((s, idx) => (
                  <View key={idx} style={styles.serviceItem}>
                    <Text style={styles.serviceName}>{s.serviceName}</Text>
                    <Text style={styles.servicePrice}>₹{s.price}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{verifiedBooking.displayAmount}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.startBtn} 
              onPress={() => startMutation.mutate(verifiedBooking.id)}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.startBtnText}>Start Service Now</Text>
                  <ChevronRight size={24} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <RefreshCcw size={18} color="#64748B" />
              <Text style={styles.resetBtnText}>Verify Another Guest</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  entryView: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  instruction: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
  },
  instructionDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  digitsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  digitBox: {
    width: 60,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  digitBoxActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  digitText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  digitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 60,
  },
  verifyingText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width * 0.85,
    justifyContent: 'center',
    gap: 12,
    marginTop: 'auto',
    marginBottom: 40,
  },
  key: {
    width: (width * 0.85 - 36) / 3,
    height: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
  },
  successView: {
    alignItems: 'center',
    padding: 24,
  },
  successBadge: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
  },
  bookingCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  typeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  bookingID: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  servicesList: {
    gap: 12,
    marginBottom: 24,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: 15,
    color: '#1E293B',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  startBtn: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  resetBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
});
