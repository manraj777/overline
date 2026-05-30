import React, { useState, useMemo } from 'react';
import Svg, { Path, Circle as SvgCircle, Line, Defs, LinearGradient, Stop, G } from 'react-native-svg';
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

function SunMoonIndicator({ time }: { time: string | null }) {
  if (!time) {
    return (
      <View style={styles.emojiContainer}>
        <Svg width={40} height={40} viewBox="0 0 24 24">
          <SvgCircle cx="12" cy="12" r="5" fill="#E2E8F0" />
          <SvgCircle cx="12" cy="12" r="8" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 2" />
        </Svg>
      </View>
    );
  }

  const [hStr, mStr] = time.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  const totalMinutes = hours * 60 + minutes;

  const isNight = hours >= 18 || hours < 6;
  const rotation = ((totalMinutes / 1440) * 360) % 360;

  if (isNight) {
    let ratio = 0;
    if (hours >= 18) {
      ratio = (hours - 18 + minutes / 60) / 6;
    } else {
      ratio = (6 - hours - minutes / 60) / 6;
    }
    ratio = Math.max(0, Math.min(1, ratio));

    const stopColor = ratio > 0.5 ? '#F8FAFC' : '#CBD5E1';
    const glowOpacity = 0.2 + ratio * 0.5;

    return (
      <View style={styles.emojiContainer}>
        <Svg width={52} height={52} viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E2E8F0" />
              <Stop offset="100%" stopColor={stopColor} />
            </LinearGradient>
          </Defs>
          <G transform={`rotate(${rotation} 12 12)`}>
            <SvgCircle
              cx="12"
              cy="12"
              r="9"
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="5 3"
              fill="none"
              opacity={0.6}
            />
            <SvgCircle cx="12" cy="3" r="1" fill="#FFF" />
            <SvgCircle cx="12" cy="21" r="0.7" fill="#FFF" />
          </G>
          <SvgCircle cx="12" cy="12" r="7" fill="#E2E8F0" opacity={glowOpacity * 0.3} />
          <Path
            d="M12 3a9 9 0 1 0 0 18c1.5 0 2.9-.35 4.15-1A7 7 0 0 1 12 3z"
            fill="url(#moonGrad)"
          />
        </Svg>
      </View>
    );
  } else {
    let ratio = 0;
    if (hours >= 6 && hours < 12) {
      ratio = (hours - 6 + minutes / 60) / 6;
    } else {
      ratio = 1.0;
    }

    const red = Math.floor(255 - (255 - 245) * ratio);
    const green = Math.floor(255 - (255 - 158) * ratio);
    const blue = Math.floor(255 - (255 - 11) * ratio);
    const sunColor = `rgb(${red}, ${green}, ${blue})`;

    return (
      <View style={styles.emojiContainer}>
        <Svg width={52} height={52} viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor={sunColor} />
            </LinearGradient>
          </Defs>
          <G transform={`rotate(${rotation} 12 12)`}>
            <SvgCircle
              cx="12"
              cy="12"
              r="9"
              stroke={sunColor}
              strokeWidth="1.2"
              strokeDasharray="6 4"
              fill="none"
              opacity={0.7}
            />
            <Line x1="12" y1="1.5" x2="12" y2="3.5" stroke={sunColor} strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="12" y1="20.5" x2="12" y2="22.5" stroke={sunColor} strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="1.5" y1="12" x2="3.5" y2="12" stroke={sunColor} strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="20.5" y1="12" x2="22.5" y2="12" stroke={sunColor} strokeWidth="1.5" strokeLinecap="round" />
          </G>
          <SvgCircle cx="12" cy="12" r="7" fill={sunColor} opacity={0.2} />
          <SvgCircle cx="12" cy="12" r="5.5" fill="url(#sunGrad)" />
        </Svg>
      </View>
    );
  }
}

export default function BookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices = [], selectedStaffId } = route.params;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotStartTime, setSelectedSlotStartTime] = useState<string | null>(null);

  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('AM');
  const [clockMode, setClockMode] = useState<'hours' | 'minutes'>('hours');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);

  // Parallel staff slots map state when "Any Staff" is selected
  const [staffSlotsMap, setStaffSlotsMap] = useState<Record<string, any[]>>({});
  const [loadingStaffSlots, setLoadingStaffSlots] = useState(false);

  const { data: shop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', shop?.id, format(selectedDate, 'yyyy-MM-dd'), selectedStaffId],
    queryFn: () =>
      queueApi
        .getSlots(shop!.id, {
          date: format(selectedDate, 'yyyy-MM-dd'),
          serviceIds: selectedServices,
          ...(selectedStaffId ? { staffId: selectedStaffId } : {}),
        })
        .then(res => res.data),
    enabled: !!shop?.id,
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

  // Fetch all staff slots in parallel if Any Staff is selected
  React.useEffect(() => {
    if (!shop?.staff || shop.staff.length === 0) return;
    if (selectedStaffId) {
      setStaffSlotsMap({});
      return;
    }

    let isMounted = true;
    async function fetchAllStaffSlots() {
      try {
        setLoadingStaffSlots(true);
        const promises = shop.staff.map((person: any) =>
          queueApi.getSlots(shop.id, {
            date: format(selectedDate, 'yyyy-MM-dd'),
            serviceIds: selectedServices,
            staffId: person.id,
          }).then(res => ({
            staffId: person.id,
            slots: (res.data || []).map((slot: any) => {
              const timePart = slot.startTime ? slot.startTime.split('T')[1]?.substring(0, 5) : '';
              return { ...slot, time: timePart };
            })
          })).catch(() => ({ staffId: person.id, slots: [] }))
        );

        const results = await Promise.all(promises);
        if (isMounted) {
          const newMap: Record<string, any[]> = {};
          results.forEach(res => {
            newMap[res.staffId] = res.slots;
          });
          setStaffSlotsMap(newMap);
        }
      } catch (err) {
        console.error('[BookingScreen] Error fetching staff slots:', err);
      } finally {
        if (isMounted) setLoadingStaffSlots(false);
      }
    }

    fetchAllStaffSlots();
    return () => {
      isMounted = false;
    };
  }, [shop?.staff, selectedDate, selectedServices, selectedStaffId]);

  const selectedTime = useMemo(() => {
    if (!selectedSlotStartTime) return null;
    const found = timeSlots.find(s => s.startTime === selectedSlotStartTime);
    if (found) return found.time;
    const match = selectedSlotStartTime.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : null;
  }, [selectedSlotStartTime, timeSlots]);

  // Synchronize slot start time with local hour, minute, AM/PM
  React.useEffect(() => {
    if (selectedSlotStartTime) {
      const match = selectedSlotStartTime.match(/T(\d{2}):(\d{2})/);
      if (match) {
        const h24 = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        setSelectedHour(h12);
        setSelectedMinute(m);
        setSelectedAmPm(ampm);
      }
    }
  }, [selectedSlotStartTime]);

  const clockRotations = useMemo(() => {
    const hr = selectedHour !== null ? selectedHour : 12;
    const mn = selectedMinute !== null ? selectedMinute : 0;
    const hourDeg = `${(hr % 12) * 30 + mn * 0.5}deg`;
    const minDeg = `${mn * 6}deg`;
    return { hourDeg, minDeg };
  }, [selectedHour, selectedMinute]);

  const nearestFreeSlot = useMemo(() => {
    if (!selectedSlotStartTime) return null;
    const selectedSlot = timeSlots.find(s => s.startTime === selectedSlotStartTime);
    if (selectedSlot && selectedSlot.available) return null;

    const availableSlots = timeSlots.filter(s => s.available);
    if (availableSlots.length === 0) return null;

    const targetDate = new Date(selectedSlotStartTime);
    let bestSlot = availableSlots[0];
    let minDiff = Infinity;

    availableSlots.forEach(slot => {
      const slotDate = new Date(slot.startTime);
      const diff = Math.abs(slotDate.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        bestSlot = slot;
      }
    });

    return bestSlot;
  }, [selectedSlotStartTime, timeSlots]);

  const timelineRange = useMemo(() => {
    if (!workingHour || workingHour.isClosed) {
      return { startMin: 9 * 60, endMin: 21 * 60 };
    }
    const [openH, openM] = workingHour.openTime.split(':').map(Number);
    const [closeH, closeM] = workingHour.closeTime.split(':').map(Number);
    return { startMin: openH * 60 + openM, endMin: closeH * 60 + closeM };
  }, [workingHour]);

  const hourMarkers = useMemo(() => {
    const markers = [];
    const startHour = Math.floor(timelineRange.startMin / 60);
    const endHour = Math.ceil(timelineRange.endMin / 60);
    for (let h = startHour; h <= endHour; h++) {
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      markers.push({
        hour24: h,
        label: `${displayHour} ${ampm}`,
        offset: ((h * 60 - timelineRange.startMin) / 15) * 12
      });
    }
    return markers;
  }, [timelineRange]);

  const handleClockHourPress = (h12: number) => {
    setSelectedHour(h12);
    const targetHour24 = selectedAmPm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    setClockMode('minutes');

    const min = selectedMinute !== null ? selectedMinute : 0;
    const timeStr = `${targetHour24.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    const found = timeSlots.find(s => s.time === timeStr);
    if (found) {
      setSelectedSlotStartTime(found.startTime);
    } else {
      const firstAvail = timeSlots.find(s => s.time.startsWith(`${targetHour24.toString().padStart(2, '0')}:`) && s.available);
      if (firstAvail) {
        setSelectedSlotStartTime(firstAvail.startTime);
      } else {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        setSelectedSlotStartTime(`${dateStr}T${timeStr}:00.000Z`);
      }
    }
  };

  const handleClockMinutePress = (m: number) => {
    setSelectedMinute(m);
    if (selectedHour !== null) {
      const h12 = selectedHour;
      const targetHour24 = selectedAmPm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
      const timeStr = `${targetHour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const found = timeSlots.find(s => s.time === timeStr);
      if (found) {
        setSelectedSlotStartTime(found.startTime);
      } else {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        setSelectedSlotStartTime(`${dateStr}T${timeStr}:00.000Z`);
      }
    }
  };

  const handleAmPmChange = (ampm: 'AM' | 'PM') => {
    setSelectedAmPm(ampm);
    if (selectedHour !== null) {
      const h12 = selectedHour;
      const targetHour24 = ampm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
      const min = selectedMinute !== null ? selectedMinute : 0;
      const timeStr = `${targetHour24.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const found = timeSlots.find(s => s.time === timeStr);
      if (found) {
        setSelectedSlotStartTime(found.startTime);
      } else {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        setSelectedSlotStartTime(`${dateStr}T${timeStr}:00.000Z`);
      }
    }
  };

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
              {/* Music Mixer Bar Visualizer */}
              {selectedStaffId ? (
                // Single staff visual timeline
                <View style={styles.singleTrackContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trackScroll}>
                    <View style={styles.trackContentWrapper}>
                      <View style={styles.hourMarkersRow}>
                        {hourMarkers.map(m => (
                          <Text key={m.hour24} style={[styles.hourMarkerText, { left: m.offset }]}>
                            {m.label}
                          </Text>
                        ))}
                      </View>
                      <View style={styles.timelineTrackRow}>
                        {(() => {
                          const { startMin, endMin } = timelineRange;
                          const blocks = [];
                          for (let minutes = startMin; minutes < endMin; minutes += 15) {
                            const h = Math.floor(minutes / 60);
                            const m = minutes % 60;
                            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            
                            const slotMatch = timeSlots.find(s => s.time === timeStr);
                            let status: 'free' | 'leave' | 'booked' = 'leave';
                            let slotData: any = null;
                            if (slotMatch) {
                              status = slotMatch.available ? 'free' : 'booked';
                              slotData = slotMatch;
                            }
                            
                            const isSelected = selectedSlotStartTime && slotMatch && selectedSlotStartTime === slotMatch.startTime;
                            
                            blocks.push(
                              <TouchableOpacity
                                key={timeStr}
                                disabled={status !== 'free'}
                                onPress={() => {
                                  if (slotData) {
                                    setSelectedSlotStartTime(slotData.startTime);
                                  }
                                }}
                                style={[
                                  styles.timelineBlock,
                                  status === 'free' && styles.timelineBlockFree,
                                  status === 'leave' && styles.timelineBlockLeave,
                                  status === 'booked' && styles.timelineBlockBooked,
                                  isSelected && styles.timelineBlockSelected,
                                ]}
                              />
                            );
                          }
                          return blocks;
                        })()}
                      </View>
                    </View>
                  </ScrollView>
                </View>
              ) : (
                // stacked tracks for each staff in multi-track music mixer style
                <View style={styles.multiTrackContainer}>
                  {loadingStaffSlots ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
                  ) : (shop?.staff || []).length === 0 ? (
                    <Text style={styles.noStaffTimeline}>No specialist timelines available</Text>
                  ) : (
                    (shop?.staff || []).map((person: any) => {
                      const slots = staffSlotsMap[person.id] || [];
                      return (
                        <View key={person.id} style={styles.staffTrackRow}>
                          <View style={styles.staffTrackLabel}>
                            <Text style={styles.staffTrackName} numberOfLines={1}>
                              {person.name}
                            </Text>
                            <Text style={styles.staffTrackRole} numberOfLines={1}>
                              {person.role || 'Specialist'}
                            </Text>
                          </View>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trackScroll}>
                            <View style={styles.trackContentWrapper}>
                              <View style={styles.hourMarkersRow}>
                                {hourMarkers.map(m => (
                                  <Text key={m.hour24} style={[styles.hourMarkerText, { left: m.offset }]}>
                                    {m.label}
                                  </Text>
                                ))}
                              </View>
                              <View style={styles.timelineTrackRow}>
                                {(() => {
                                  const { startMin, endMin } = timelineRange;
                                  const blocks = [];
                                  for (let minutes = startMin; minutes < endMin; minutes += 15) {
                                    const h = Math.floor(minutes / 60);
                                    const m = minutes % 60;
                                    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                    
                                    const slotMatch = slots.find(s => s.time === timeStr);
                                    let status: 'free' | 'leave' | 'booked' = 'leave';
                                    let slotData: any = null;
                                    if (slotMatch) {
                                      status = slotMatch.available ? 'free' : 'booked';
                                      slotData = slotMatch;
                                    }
                                    
                                    const isSelected = selectedSlotStartTime && slotMatch && selectedSlotStartTime === slotMatch.startTime;
                                    
                                    blocks.push(
                                      <TouchableOpacity
                                        key={timeStr}
                                        disabled={status !== 'free'}
                                        onPress={() => {
                                          if (slotData) {
                                            setSelectedSlotStartTime(slotData.startTime);
                                          }
                                        }}
                                        style={[
                                          styles.timelineBlock,
                                          status === 'free' && styles.timelineBlockFree,
                                          status === 'leave' && styles.timelineBlockLeave,
                                          status === 'booked' && styles.timelineBlockBooked,
                                          isSelected && styles.timelineBlockSelected,
                                        ]}
                                      />
                                    );
                                  }
                                  return blocks;
                                })()}
                              </View>
                            </View>
                          </ScrollView>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* Legend & Scale */}
              <View style={styles.timelineLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Booked</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#CBD5E1' }]} />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
                  <Text style={styles.legendText}>Rest/Break</Text>
                </View>
              </View>

              {/* Suggestion Card banner */}
              {nearestFreeSlot && (
                <TouchableOpacity
                  style={styles.suggestionBanner}
                  onPress={() => setSelectedSlotStartTime(nearestFreeSlot.startTime)}
                >
                  <CalendarX size={18} color="#ba1a1a" />
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionTitle}>Selected time is unavailable</Text>
                    <Text style={styles.suggestionSub}>
                      Tap to select nearest free slot at <Text style={{ fontWeight: 'bold' }}>{formatSlotTime(nearestFreeSlot.time)}</Text> instead
                    </Text>
                  </View>
                  <View style={styles.suggestionAction}>
                    <Text style={styles.suggestionActionText}>Select</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Clock Picker display */}
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
                  
                  {/* Clickable Clock numbers */}
                  {clockMode === 'hours' ? (
                    [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                      const angle = (h * 30 - 90) * (Math.PI / 180);
                      const radius = 72;
                      const buttonSize = 26;
                      const x = 100 - buttonSize / 2 + radius * Math.cos(angle);
                      const y = 100 - buttonSize / 2 + radius * Math.sin(angle);
                      
                      const hasAvailable = timeSlots.some(s => {
                        if (!s.available) return false;
                        const [hStr] = s.time.split(':');
                        const slotHour = parseInt(hStr, 10);
                        const ampm = slotHour >= 12 ? 'PM' : 'AM';
                        return slotHour % 12 === h % 12 && ampm === selectedAmPm;
                      });

                      const isCurrentHour = selectedHour === h;

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
                    })
                  ) : (
                    [0, 15, 30, 45].map((m) => {
                      const h = m === 0 ? 12 : (m === 15 ? 3 : (m === 30 ? 6 : 9));
                      const angle = (h * 30 - 90) * (Math.PI / 180);
                      const radius = 72;
                      const buttonSize = 26;
                      const x = 100 - buttonSize / 2 + radius * Math.cos(angle);
                      const y = 100 - buttonSize / 2 + radius * Math.sin(angle);

                      const hasAvailable = selectedHour !== null && timeSlots.some(s => {
                        if (!s.available) return false;
                        const [hStr, mStr] = s.time.split(':');
                        const slotHour = parseInt(hStr, 10);
                        const slotMin = parseInt(mStr, 10);
                        const ampm = slotHour >= 12 ? 'PM' : 'AM';
                        const targetHour24 = selectedAmPm === 'PM' ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour);
                        return slotHour === targetHour24 && slotMin === m;
                      });

                      const isCurrentMinute = selectedMinute === m;

                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => handleClockMinutePress(m)}
                          style={[
                            styles.clockHourButton,
                            { left: x, top: y, width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
                            isCurrentMinute && styles.clockHourButtonActive,
                            !hasAvailable && styles.clockHourButtonDisabled
                          ]}
                        >
                          <Text style={[
                            styles.clockHourText,
                            isCurrentMinute && styles.clockHourTextActive,
                            !hasAvailable && styles.clockHourTextDisabled
                          ]}>
                            {m.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
                
                {/* Digital displaying interactive inputs & Sun/Moon indicator */}
                <View style={styles.clockDigitalContainer}>
                  <SunMoonIndicator time={selectedTime} />
                  
                  <View style={styles.clockDigitalTimeRow}>
                    <TouchableOpacity 
                      onPress={() => setClockMode('hours')}
                      style={[styles.digitalDigitBtn, clockMode === 'hours' && styles.digitalDigitBtnActive]}
                    >
                      <Text style={[styles.digitalDigitText, clockMode === 'hours' && styles.digitalDigitTextActive]}>
                        {selectedHour !== null ? selectedHour.toString().padStart(2, '0') : '12'}
                      </Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.digitalDivider}>:</Text>
                    
                    <TouchableOpacity 
                      onPress={() => setClockMode('minutes')}
                      style={[styles.digitalDigitBtn, clockMode === 'minutes' && styles.digitalDigitBtnActive]}
                    >
                      <Text style={[styles.digitalDigitText, clockMode === 'minutes' && styles.digitalDigitTextActive]}>
                        {selectedMinute !== null ? selectedMinute.toString().padStart(2, '0') : '00'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.ampmToggleRow}>
                    <TouchableOpacity
                      onPress={() => handleAmPmChange('AM')}
                      style={[styles.ampmBtn, selectedAmPm === 'AM' && styles.ampmBtnActive]}
                    >
                      <Text style={[styles.ampmText, selectedAmPm === 'AM' && styles.ampmTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAmPmChange('PM')}
                      style={[styles.ampmBtn, selectedAmPm === 'PM' && styles.ampmBtnActive]}
                    >
                      <Text style={[styles.ampmText, selectedAmPm === 'PM' && styles.ampmTextActive]}>PM</Text>
                    </TouchableOpacity>
                  </View>
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
  singleTrackContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  trackScroll: {
    flexGrow: 0,
  },
  trackContentWrapper: {
    paddingVertical: Spacing.sm,
    position: 'relative',
    height: 80,
  },
  hourMarkersRow: {
    height: 20,
    position: 'relative',
    width: 1000,
  },
  hourMarkerText: {
    position: 'absolute',
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeights.medium,
  },
  timelineTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 40,
    marginTop: 10,
  },
  timelineBlock: {
    width: 11,
    height: 32,
    marginRight: 1,
    borderRadius: 4,
  },
  timelineBlockFree: {
    backgroundColor: '#E2E8F0', // light grey
  },
  timelineBlockLeave: {
    backgroundColor: '#64748B', // dark grey
  },
  timelineBlockBooked: {
    backgroundColor: '#10B981', // green
  },
  timelineBlockSelected: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    ...Shadows.glow,
  },
  multiTrackContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.md,
  },
  staffTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  staffTrackLabel: {
    width: 80,
    justifyContent: 'center',
  },
  staffTrackName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  staffTrackRole: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  noStaffTimeline: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  timelineLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    borderColor: '#F8B4B4',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#ba1a1a',
  },
  suggestionSub: {
    fontSize: FontSizes.xs,
    color: '#7a1a1a',
  },
  suggestionAction: {
    backgroundColor: '#ba1a1a',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  suggestionActionText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  clockDigitalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockDigitalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  digitalDigitBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minWidth: 50,
    alignItems: 'center',
  },
  digitalDigitBtnActive: {
    backgroundColor: Colors.primaryGhost,
    borderColor: Colors.primary,
  },
  digitalDigitText: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
  },
  digitalDigitTextActive: {
    color: Colors.primary,
  },
  digitalDivider: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.xs,
  },
  ampmToggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  ampmBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ampmBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ampmText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.bold,
  },
  ampmTextActive: {
    color: '#FFFFFF',
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
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
});
