import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, addDays, isSameDay } from 'date-fns';
import { shopsApi, queueApi } from '../../api/client';
import { RootStackParamList, TimeSlot } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { CalendarX, UserRound } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'Booking'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices = [], selectedStaffId } = route.params;

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
          ...(selectedStaffId ? { staffId: selectedStaffId } : {}),
        })
        .then(res => res.data),
  });

  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  const timeSlots: TimeSlot[] = availability?.slots || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Book Appointment</Text>
          <Text style={styles.stepSubtitle}>Step 3 of 4 • Choose date and time</Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.step, styles.stepActive]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepLineActive} />
            <View style={[styles.step, styles.stepActive]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepLineActive} />
            <View style={[styles.step, selectedTime ? styles.stepActive : undefined]}>
              <Text style={[styles.stepNumber, !selectedTime && { color: Colors.textTertiary }]}>3</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, selectedTime ? styles.stepActive : undefined]}>
              <Text style={[styles.stepNumber, !selectedTime && { color: Colors.textTertiary }]}>4</Text>
            </View>
          </View>
        </View>

        {selectedStaffId && (
          <View style={styles.section}>
            <View style={styles.staffHint}>
              <UserRound color={Colors.primary} size={16} />
              <Text style={styles.staffHintText}>
                Professional selected • {selectedStaffId.slice(-4).toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
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
          <Text style={styles.sectionTitle}>Available Time Slots</Text>
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

        {shop && selectedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Services</Text>
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
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Continue to Review & Pay"
          onPress={() => {
            if (!selectedTime) {
              return;
            }
            navigation.navigate('BookingReview', {
              shopId,
              selectedServices,
              selectedDate: format(selectedDate, 'yyyy-MM-dd'),
              selectedTime,
              selectedStaffId,
            });
          }}
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
    paddingHorizontal: Spacing.md,
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
  staffHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryGhost,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  staffHintText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
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
    ...Shadows.md,
  },
});
