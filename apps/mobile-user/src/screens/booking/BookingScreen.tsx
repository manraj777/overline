import React, { useState, useMemo } from 'react';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';
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

function formatSlotTime(timeStr: string) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH.toString().padStart(2, '0')}:${mStr} ${ampm}`;
}

export default function BookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices = [], selectedStaffId } = route.params;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotStartTime, setSelectedSlotStartTime] = useState<string | null>(null);

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

  const workingHour = useMemo(() => {
    if (!shop?.workingHours) return null;
    const dayOfWeekStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
    }).format(selectedDate).toUpperCase();
    return shop.workingHours.find((wh: any) => wh.dayOfWeek === dayOfWeekStr);
  }, [shop?.workingHours, selectedDate]);

  const dayTimelineRange = useMemo(() => {
    if (!workingHour || workingHour.isClosed) {
      return { startMinutes: 9 * 60, endMinutes: 21 * 60, totalSlots: 49 };
    }
    const [openH, openM] = workingHour.openTime.split(':').map(Number);
    const [closeH, closeM] = workingHour.closeTime.split(':').map(Number);
    const startMin = openH * 60 + openM;
    const endMin = closeH * 60 + closeM;
    const totalSlots = Math.floor((endMin - startMin) / 15) + 1;
    return { startMinutes: startMin, endMinutes: endMin, totalSlots };
  }, [workingHour]);

  const timeSlots = useMemo(() => {
    const rawSlots: any[] = Array.isArray(availability) ? availability : [];
    return rawSlots.map(slot => {
      const timePart = slot.startTime ? slot.startTime.split('T')[1]?.substring(0, 5) : '';
      return {
        ...slot,
        time: timePart,
      };
    });
  }, [availability]);

  const handleClockHourPress = (hour12: number) => {
    // Search for available slots in this hour (either AM or PM)
    const matchingSlots = timeSlots.filter(s => {
      if (!s.available) return false;
      const [hStr] = s.time.split(':');
      const slotHour = parseInt(hStr, 10);
      return slotHour % 12 === hour12 % 12;
    });

    if (matchingSlots.length > 0) {
      // Snap to the first available slot in that hour
      setSelectedSlotStartTime(matchingSlots[0].startTime);
    }
  };

  const selectedTime = useMemo(() => {
    if (!selectedSlotStartTime) return null;
    const found = timeSlots.find(s => s.startTime === selectedSlotStartTime);
    return found ? found.time : null;
  }, [selectedSlotStartTime, timeSlots]);

  const clockRotations = useMemo(() => {
    if (!selectedTime) {
      return { hourDeg: '0deg', minDeg: '0deg' };
    }
    const [hStr, mStr] = selectedTime.split(':');
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    const hourDeg = `${(hours % 12) * 30 + minutes * 0.5}deg`;
    const minDeg = `${minutes * 6}deg`;
    return { hourDeg, minDeg };
  }, [selectedTime]);

  const groupedSlots = useMemo(() => {
    const availableOnly = timeSlots.filter(s => s.available);
    const morning = availableOnly.filter(s => {
      if (!s.time) return false;
      const [hStr] = s.time.split(':');
      const h = parseInt(hStr, 10);
      return h < 12;
    });
    const afternoon = availableOnly.filter(s => {
      if (!s.time) return false;
      const [hStr] = s.time.split(':');
      const h = parseInt(hStr, 10);
      return h >= 12 && h < 17;
    });
    const evening = availableOnly.filter(s => {
      if (!s.time) return false;
      const [hStr] = s.time.split(':');
      const h = parseInt(hStr, 10);
      return h >= 17;
    });
    return { morning, afternoon, evening };
  }, [timeSlots]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Clean Header */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Book Appointment</Text>
          <Text style={styles.stepSubtitle}>Choose date and time for your visit</Text>
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
                    setSelectedSlotStartTime(null);
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
          <Text style={styles.sectionTitle}>Visual Availability Timeline</Text>
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
            <View>
              {/* Grouped Time Period Selector — Sun-to-Moon Design */}
              <View style={styles.groupedSlotsContainer}>
                {/* Morning Slots */}
                {groupedSlots.morning.length > 0 && (
                  <View style={[styles.periodBlock, styles.periodBlockMorning]}>
                    <View style={styles.periodHeader}>
                      <View style={[styles.periodIconWrap, { backgroundColor: '#FFF8F0' }]}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <SvgCircle cx={12} cy={12} r={5} fill="#D4D4D4" />
                          {[0,45,90,135,180,225,270,315].map((angle) => {
                            const rad = (angle * Math.PI) / 180;
                            return (
                              <Line
                                key={angle}
                                x1={12 + 7.5 * Math.cos(rad)}
                                y1={12 + 7.5 * Math.sin(rad)}
                                x2={12 + 10 * Math.cos(rad)}
                                y2={12 + 10 * Math.sin(rad)}
                                stroke="#BFBFBF"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                              />
                            );
                          })}
                        </Svg>
                      </View>
                      <View>
                        <Text style={styles.periodLabel}>Morning</Text>
                        <Text style={styles.periodSub}>Before 12 PM</Text>
                      </View>
                    </View>
                    <View style={styles.slotsGrid}>
                      {groupedSlots.morning.map((slot) => {
                        const isSelected = selectedSlotStartTime === slot.startTime;
                        return (
                          <TouchableOpacity
                            key={slot.startTime}
                            style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                            onPress={() => setSelectedSlotStartTime(slot.startTime)}
                          >
                            <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                              {formatSlotTime(slot.time)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Afternoon Slots */}
                {groupedSlots.afternoon.length > 0 && (
                  <View style={[styles.periodBlock, styles.periodBlockAfternoon]}>
                    <View style={styles.periodHeader}>
                      <View style={[styles.periodIconWrap, { backgroundColor: '#F5F5F5' }]}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <SvgCircle cx={12} cy={12} r={5} fill="#A3A3A3" />
                          {[0,45,90,135,180,225,270,315].map((angle) => {
                            const rad = (angle * Math.PI) / 180;
                            return (
                              <Line
                                key={angle}
                                x1={12 + 7.5 * Math.cos(rad)}
                                y1={12 + 7.5 * Math.sin(rad)}
                                x2={12 + 10 * Math.cos(rad)}
                                y2={12 + 10 * Math.sin(rad)}
                                stroke="#8C8C8C"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                              />
                            );
                          })}
                        </Svg>
                      </View>
                      <View>
                        <Text style={styles.periodLabel}>Afternoon</Text>
                        <Text style={styles.periodSub}>12 — 5 PM</Text>
                      </View>
                    </View>
                    <View style={styles.slotsGrid}>
                      {groupedSlots.afternoon.map((slot) => {
                        const isSelected = selectedSlotStartTime === slot.startTime;
                        return (
                          <TouchableOpacity
                            key={slot.startTime}
                            style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                            onPress={() => setSelectedSlotStartTime(slot.startTime)}
                          >
                            <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                              {formatSlotTime(slot.time)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Evening Slots */}
                {groupedSlots.evening.length > 0 && (
                  <View style={[styles.periodBlock, styles.periodBlockEvening]}>
                    <View style={styles.periodHeader}>
                      <View style={[styles.periodIconWrap, { backgroundColor: '#F0F0F0' }]}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M12 3a9 9 0 1 0 0 18c1.5 0 2.9-.35 4.15-1A7 7 0 0 1 12 3z"
                            fill="#737373"
                          />
                        </Svg>
                      </View>
                      <View>
                        <Text style={styles.periodLabel}>Evening</Text>
                        <Text style={styles.periodSub}>After 5 PM</Text>
                      </View>
                    </View>
                    <View style={styles.slotsGrid}>
                      {groupedSlots.evening.map((slot) => {
                        const isSelected = selectedSlotStartTime === slot.startTime;
                        return (
                          <TouchableOpacity
                            key={slot.startTime}
                            style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                            onPress={() => setSelectedSlotStartTime(slot.startTime)}
                          >
                            <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                              {formatSlotTime(slot.time)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Gauge Clock display */}
              <View style={styles.clockContainer}>
                <View style={styles.clockFace}>
                  {/* Hour hand */}
                  <View style={[styles.handContainer, { transform: [{ rotate: clockRotations.hourDeg }] }]}>
                    <View style={styles.hourHand} />
                  </View>
                  {/* Minute hand */}
                  <View style={[styles.handContainer, { transform: [{ rotate: clockRotations.minDeg }] }]}>
                    <View style={styles.minuteHand} />
                  </View>
                  {/* Center pin */}
                  <View style={styles.centerPin} />
                  
                  {/* Clickable Clock hour numbers */}
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                    const angle = (h * 30 - 90) * (Math.PI / 180);
                    const radius = 72; // distance from center (100, 100)
                    const buttonSize = 26;
                    const x = 100 - buttonSize / 2 + radius * Math.cos(angle);
                    const y = 100 - buttonSize / 2 + radius * Math.sin(angle);
                    
                    const hasAvailable = timeSlots.some(s => {
                      if (!s.available) return false;
                      const [hStr] = s.time.split(':');
                      const slotHour = parseInt(hStr, 10);
                      return slotHour % 12 === h % 12;
                    });

                    const isCurrentHour = selectedTime ? parseInt(selectedTime.split(':')[0], 10) % 12 === h % 12 : false;

                    return (
                      <TouchableOpacity
                        key={h}
                        onPress={() => handleClockHourPress(h)}
                        disabled={!hasAvailable}
                        style={[
                          styles.clockHourButton,
                          { left: x, top: y, width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
                          isCurrentHour && styles.clockHourButtonActive,
                          !hasAvailable && styles.clockHourButtonDisabled
                        ]}
                      >
                        <Text style={[
                          styles.clockHourText,
                          isCurrentHour && styles.clockHourTextActive,
                          !hasAvailable && styles.clockHourTextDisabled
                        ]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                <View style={styles.clockTextContainer}>
                  <Text style={styles.clockDigitalLabel}>SELECTED SLOT</Text>
                  <Text style={styles.clockDigitalTime}>
                    {selectedTime ? formatSlotTime(selectedTime) : 'Select a Slot'}
                  </Text>
                  <Text style={styles.clockStatusText}>
                    {selectedTime ? 'Specialist available' : 'Tap slot or hour numbers'}
                  </Text>
                </View>
              </View>

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

  // Timeline availability styling
  timelineScroll: {
    paddingVertical: 12,
    gap: 6,
  },
  timelineSegmentContainer: {
    alignItems: 'center',
    width: 32,
  },
  timelineBar: {
    width: 12,
    height: 48,
    borderRadius: 6,
  },
  barAvailable: {
    backgroundColor: '#CBD5E1', // light gray
  },
  barBooked: {
    backgroundColor: '#10B981', // green
  },
  barBreak: {
    backgroundColor: '#475569', // solid dark gray
  },
  barSelected: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFF',
    ...Shadows.glow,
  },
  segmentLabel: {
    fontSize: 9,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  segmentLabelSelected: {
    color: Colors.primary,
  },

  // Clock Gauge styles
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 24,
    gap: 24,
  },
  clockFace: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.primary,
    position: 'relative',
    backgroundColor: Colors.background,
  },
  handContainer: {
    width: 194,
    height: 194,
    position: 'absolute',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  hourHand: {
    width: 4,
    height: 50,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
    marginTop: 47,
  },
  minuteHand: {
    width: 2,
    height: 75,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginTop: 22,
  },
  centerPin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    top: 91,
    left: 91,
  },
  clockHourButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clockHourButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  clockHourButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    opacity: 0.25,
  },
  clockHourText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textSecondary,
  },
  clockHourTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  clockHourTextDisabled: {
    color: Colors.textMuted,
  },
  clockTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  clockDigitalLabel: {
    fontSize: 10,
    fontWeight: FontWeights.extrabold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  clockDigitalTime: {
    fontSize: 22,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  clockStatusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeights.semibold,
  },
  groupedSlotsContainer: {
    gap: Spacing.lg,
    paddingVertical: 12,
  },
  periodBlock: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
  },
  periodBlockMorning: {
    borderLeftColor: '#D4B896',
  },
  periodBlockAfternoon: {
    borderLeftColor: '#A3A3A3',
  },
  periodBlockEvening: {
    borderLeftColor: '#525252',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  periodIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  periodSub: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: FontWeights.medium,
    marginTop: 1,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.sm,
  },
  slotChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  slotChipTextSelected: {
    color: '#FFF',
  },
});
