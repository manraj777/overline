import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { shopApi } from '../../api/client';
import { RootStackParamList, WorkingHours, DayHours } from '../../types';
import { Colors, FontSize, FontWeight, Radius, Spacing, Shadows } from '../../theme';
import { Clock, Calendar, ChevronRight, CheckCircle2, AlertCircle, Copy, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type RouteProps = RouteProp<RootStackParamList, 'WorkingHours'>;

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
  '20:00', '21:00', '22:00',
];

const defaultDayHours: DayHours = {
  isOpen: true,
  openTime: '09:00',
  closeTime: '21:00',
};

export default function WorkingHoursScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { shopId } = route.params;

  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { ...defaultDayHours },
    tuesday: { ...defaultDayHours },
    wednesday: { ...defaultDayHours },
    thursday: { ...defaultDayHours },
    friday: { ...defaultDayHours },
    saturday: { ...defaultDayHours },
    sunday: { ...defaultDayHours, isOpen: false },
  });
  
  const [selectedDay, setSelectedDay] = useState<string>('monday');

  const { data: shopData, isLoading } = useQuery({
    queryKey: ['adminShopHours', shopId],
    queryFn: () => shopApi.getWorkingHours(shopId).then(res => res.data),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (shopData) setWorkingHours(shopData);
  }, [shopData]);

  const updateMutation = useMutation({
    mutationFn: (hours: WorkingHours) => shopApi.updateWorkingHours(shopId, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminShop', shopId] });
      Alert.alert('Settings Synchronized', 'Your shop operating hours are now updated across all systems.');
    },
  });

  const handleToggleDay = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day as keyof WorkingHours], isOpen: !prev[day as keyof WorkingHours]?.isOpen },
    }));
  };

  const copyToAll = () => {
    const currentDayHours = workingHours[selectedDay as keyof WorkingHours];
    if (!currentDayHours) return;
    
    Alert.alert(
      'Bulk Apply',
      `Apply ${selectedDay}'s hours to every other day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply to All', 
          onPress: () => {
            const newHours = { ...workingHours };
            DAYS.forEach(day => {
              newHours[day as keyof WorkingHours] = { ...currentDayHours };
            });
            setWorkingHours(newHours);
          } 
        }
      ]
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentHours = workingHours[selectedDay as keyof WorkingHours];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Operating Hours</Text>
          <Text style={styles.subtitle}>Manage IST (+05:30) business schedule and intervals.</Text>
        </View>

        {/* Day Selector Hub */}
        <View style={styles.daySelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
            {DAYS.map(day => {
              const active = selectedDay === day;
              const closed = !workingHours[day as keyof WorkingHours]?.isOpen;
              return (
                <TouchableOpacity 
                  key={day} 
                  style={[styles.dayTab, active && styles.dayTabActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                    {day.substring(0, 3).toUpperCase()}
                  </Text>
                  <View style={[styles.statusDot, closed ? styles.statusOffline : styles.statusOnline]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          <View style={styles.scheduleCard}>
            <View style={styles.cardHeader}>
              <View style={styles.dayFocus}>
                <Text style={styles.focusDayName}>{selectedDay.toUpperCase()}</Text>
                <View style={[styles.badge, currentHours?.isOpen ? styles.badgeOpen : styles.badgeClosed]}>
                  <Text style={styles.badgeText}>{currentHours?.isOpen ? 'ACCEPTING BOOKINGS' : 'CLOSED'}</Text>
                </View>
              </View>
              <Switch
                value={currentHours?.isOpen}
                onValueChange={() => handleToggleDay(selectedDay)}
                trackColor={{ false: '#E2E8F0', true: Colors.primary100 }}
                thumbColor={currentHours?.isOpen ? Colors.primary : '#94A3B8'}
              />
            </View>

            {currentHours?.isOpen && (
              <View style={styles.timeSettings}>
                <Text style={styles.settingLabel}>Shift Intervals</Text>
                
                <View style={styles.timelineRow}>
                  <View style={styles.timePoint}>
                    <Text style={styles.timePointLabel}>OPENS</Text>
                    <Text style={styles.timePointValue}>{formatTime(currentHours.openTime)}</Text>
                  </View>
                  <View style={styles.timelineBar}>
                    <View style={styles.timelineFill} />
                  </View>
                  <View style={styles.timePoint}>
                    <Text style={[styles.timePointLabel, { textAlign: 'right' }]}>CLOSES</Text>
                    <Text style={[styles.timePointValue, { textAlign: 'right' }]}>{formatTime(currentHours.closeTime)}</Text>
                  </View>
                </View>

                {/* Selection Grids */}
                <Text style={styles.gridLabel}>Select Opening Time</Text>
                <View style={styles.grid}>
                  {TIME_SLOTS.slice(0, 10).map(t => (
                    <TouchableOpacity 
                      key={t}
                      style={[styles.chip, currentHours.openTime === t && styles.chipActive]}
                      onPress={() => setWorkingHours(prev => ({
                        ...prev,
                        [selectedDay]: { ...currentHours, openTime: t }
                      }))}
                    >
                      <Text style={[styles.chipText, currentHours.openTime === t && styles.chipTextActive]}>{formatTime(t)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.gridLabel, { marginTop: 20 }]}>Select Closing Time</Text>
                <View style={styles.grid}>
                  {TIME_SLOTS.slice(8).map(t => (
                    <TouchableOpacity 
                      key={t}
                      style={[styles.chip, currentHours.closeTime === t && styles.chipActive]}
                      onPress={() => setWorkingHours(prev => ({
                        ...prev,
                        [selectedDay]: { ...currentHours, closeTime: t }
                      }))}
                    >
                      <Text style={[styles.chipText, currentHours.closeTime === t && styles.chipTextActive]}>{formatTime(t)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.optionsSection}>
            <TouchableOpacity style={styles.optionBtn} onPress={copyToAll}>
              <View style={styles.optionIconBox}>
                <Copy size={20} color={Colors.primary} />
              </View>
              <View style={styles.optionTextContent}>
                <Text style={styles.optionTitle}>One-Click Sync (All 7 Days)</Text>
                <Text style={styles.optionSubtitle}>Apply selected day timing to all weekdays in IST.</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Zap size={16} color={Colors.primary} fill={Colors.primary} />
              <Text style={styles.infoText}>Changes take effect instantly for all new customer appointments.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, updateMutation.isPending && { opacity: 0.7 }]}
            onPress={() => updateMutation.mutate(workingHours)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>SYNC GLOBAL SCHEDULE</Text>
                <CheckCircle2 size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  daySelector: {
    marginBottom: 24,
  },
  dayScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  dayTab: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  dayTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayTabText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
  },
  dayTabTextActive: {
    color: '#FFF',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#F43F5E',
  },
  mainContent: {
    paddingHorizontal: 24,
  },
  scheduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 20,
    marginBottom: 24,
  },
  dayFocus: {
    flex: 1,
  },
  focusDayName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  badgeOpen: {
    backgroundColor: '#ECFDF5',
  },
  badgeClosed: {
    backgroundColor: '#FFF1F2',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  timeSettings: {
    // Content settings
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  timePoint: {
    width: 80,
  },
  timePointLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
  },
  timePointValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  timelineBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    width: '100%',
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: Colors.primary,
  },
  optionsSection: {
    marginTop: 24,
    gap: 16,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 24,
    gap: 8,
    ...Shadows.glow,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
