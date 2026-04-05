import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows, Radius } from '../../theme';
import { 
  Clock, 
  CircleDot, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Timer, 
  MapPin,
  CalendarCheck,
  Zap,
  Coffee
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MyScheduleScreen() {
  const queryClient = useQueryClient();
  const { selectedShopId } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['staffMySchedule', selectedShopId],
    queryFn: () => shopApi.getWorkingHours(selectedShopId!).then(res => res.data || {}),
    enabled: !!selectedShopId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => shopApi.updateWorkingHours(selectedShopId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMySchedule'] });
      Alert.alert('Shift Profile Synced', 'Your availability has been globally updated.');
    }
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const DayCard = ({ day }: { day: string }) => {
    // Example slots for high-fidelity demonstration
    const slots = [
      { start: '10:00 AM', end: '02:00 PM', variant: 'morning' },
      { start: '04:00 PM', end: '09:00 PM', variant: 'evening' }
    ];

    return (
      <View style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dayMain}>
            <CalendarCheck size={18} color={Colors.primary} />
            <Text style={styles.dayTitle}>{day}</Text>
          </View>
          <Switch 
            value={true} 
            trackColor={{ false: '#CBD5E1', true: '#10B981' }} 
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        <View style={styles.slotGrid}>
          {slots.map((slot, idx) => (
            <View key={idx} style={styles.slotRow}>
              <View style={styles.slotInfo}>
                <View style={[styles.slotBadge, { backgroundColor: slot.variant === 'morning' ? '#F0F9FF' : '#FFF7ED' }]}>
                   {slot.variant === 'morning' ? <Zap size={10} color="#0EA5E9" /> : <Coffee size={10} color="#F59E0B" />}
                </View>
                <Text style={styles.slotTime}>{slot.start} — {slot.end}</Text>
              </View>
              <TouchableOpacity>
                <Trash2 size={14} color="#F43F5E" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addSlotBtn}>
            <Plus size={14} color={Colors.primary} />
            <Text style={styles.addSlotText}>ADD GAP / SHIFT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Service Timing</Text>
            <Text style={styles.subtitle}>Flexible 7-day shift gapping</Text>
          </View>
          <View style={[styles.onlineTag, isOnline ? styles.bgOnline : styles.bgOffline]}>
            <CircleDot size={12} color={isOnline ? '#10B981' : '#F43F5E'} fill={isOnline ? '#10B981' : '#F43F5E'} />
            <Text style={[styles.onlineText, isOnline ? styles.textOnline : styles.textOffline]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        <View style={styles.statusBanner}>
          <View style={styles.statusContent}>
            <Timer size={18} color="#FFF" />
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.statusLabel}>MASTER SWITCH</Text>
              <Text style={styles.statusTitle}>Instantly Toggle Live Visibility</Text>
            </View>
          </View>
          <Switch 
            value={isOnline} 
            onValueChange={setIsOnline} 
            trackColor={{ false: '#64748B', true: '#FFF' }}
            thumbColor={isOnline ? Colors.primary : '#FFF'}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionLabel}>WEEKLY REGIME (IST UTC +5:30)</Text>
          {DAYS.map(day => <DayCard key={day} day={day} />)}
          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.syncBtn} onPress={() => updateMutation.mutate(schedule)}>
             <Text style={styles.syncBtnText}>SYNCHRONIZE TIMINGS</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '800', marginTop: 2 },
  onlineTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  bgOnline: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  bgOffline: { backgroundColor: '#FFF1F2', borderColor: '#FECACA' },
  onlineText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  textOnline: { color: '#10B981' },
  textOffline: { color: '#F43F5E' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, marginHorizontal: 24, padding: 20, borderRadius: 24, ...Shadows.glow, marginBottom: 32 },
  statusContent: { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statusTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 2 },
  scroll: { paddingHorizontal: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 16, marginLeft: 12 },
  dayCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dayMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  slotGrid: { gap: 12 },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  slotInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotBadge: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  slotTime: { fontSize: 13, fontWeight: '800', color: '#475569' },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 14, marginTop: 4 },
  addSlotText: { fontSize: 11, fontWeight: '900', color: Colors.primary, letterSpacing: 1 },
  actions: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  syncBtn: { backgroundColor: '#0F172A', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  syncBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});
