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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, addDays, isSameDay } from 'date-fns';
import { shopsApi, bookingsApi, queueApi } from '../../api/client';
import { RootStackParamList, TimeSlot } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton, Divider } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { CalendarX } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'Booking'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices = [] } = route.params;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

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

  const createBooking = useMutation({
    mutationFn: (data: { shopId: string; serviceIds: string[]; startTime: string }) =>
      bookingsApi.create(data),
    onSuccess: data => {
      navigation.replace('BookingConfirmation', { bookingId: data.data.id });
    },
    onError: (error: any) => {
      Alert.alert('Booking Failed', error.response?.data?.message || 'Failed to create booking');
    },
  });

  const handleConfirm = () => {
    if (!selectedTime) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    // Check phone verification before booking
    const user = useAuthStore.getState().user;
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
    createBooking.mutate({ shopId, serviceIds: selectedServices, startTime });
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
          <View style={[styles.step, selectedTime ? styles.stepActive : undefined]}>
            <Text style={[styles.stepNumber, !selectedTime && { color: Colors.textTertiary }]}>
              2
            </Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: Colors.textTertiary }]}>3</Text>
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
                <Text style={styles.summaryTotalPrice}>
                  ₹{shop.services
                    ?.filter((s: any) => selectedServices.includes(s.id))
                    .reduce((sum: number, s: any) => sum + Number(s.price), 0)}
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
          title="Confirm Booking"
          onPress={handleConfirm}
          loading={createBooking.isPending}
          disabled={!selectedTime}
          icon="✓"
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
