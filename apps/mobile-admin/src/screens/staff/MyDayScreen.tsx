import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, bookingsApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../theme';
import { 
  Clock, 
  Users, 
  CheckCircle2, 
  ChevronRight, 
  Timer, 
  Star,
  Zap,
  Calendar,
  IndianRupee,
  AlertCircle
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSocketEvent } from '../../hooks/useSocket';

const { width } = Dimensions.get('window');

export default function MyDayScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { selectedShopId, user } = useAuthStore();
  const [activeTask, setActiveTask] = useState<any>(null);

  const statsQuery = useQuery({
    queryKey: ['staffMyDayStats', selectedShopId],
    queryFn: () => dashboardApi.getStats(selectedShopId!).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const nextBookingsQuery = useQuery({
    queryKey: ['staffNextBookings', selectedShopId],
    queryFn: () =>
      bookingsApi
        .getAll(selectedShopId!, { status: 'CONFIRMED', limit: 5 })
        .then(res => res.data?.bookings || res.data || []),
    enabled: !!selectedShopId,
  });

  // Real-time synchronization
  useSocketEvent('booking_new', () => {
    queryClient.invalidateQueries({ queryKey: ['staffMyDayStats'] });
    queryClient.invalidateQueries({ queryKey: ['staffNextBookings'] });
  });

  useSocketEvent('queue_position_update', () => {
    queryClient.invalidateQueries({ queryKey: ['staffNextBookings'] });
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={Colors.gray400} />
        <Text style={styles.emptyText}>Switch to a shop to view your shift dashboard</Text>
      </View>
    );
  }

  if (statsQuery.isLoading || nextBookingsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const nextBooking = nextBookingsQuery.data?.[0];

  return (
    <View style={styles.container}>
      {/* Premium Shift Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>SPECIALIST HUB</Text>
            <Text style={styles.title}>Hello, {user?.name?.split(' ')[0]}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>On Shift</Text>
          </View>
        </View>

        <View style={styles.shiftCard}>
          <View style={styles.shiftInfo}>
            <View style={styles.shiftTimeWrap}>
              <Clock size={16} color="#FFF" />
              <Text style={styles.shiftTime}>Shift: 09:00 AM - 07:00 PM</Text>
            </View>
            <Text style={styles.shopName}>Elite Wellness Studio</Text>
          </View>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('VerifyCode')}
          >
            <Text style={styles.actionBtnText}>SCAN CODE</Text>
            <Zap size={14} color={Colors.primary} fill={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={statsQuery.isRefetching}
            onRefresh={() => {
              statsQuery.refetch();
              nextBookingsQuery.refetch();
            }}
            colors={[Colors.primary]}
          />
        }>
        
        {/* Next Up Focus */}
        <Text style={styles.sectionTitle}>Next Appointment</Text>
        {nextBooking ? (
          <TouchableOpacity 
            style={styles.nextCard}
            onPress={() => navigation.navigate('BookingDetail', { id: nextBooking.id })}
          >
            <View style={styles.nextHeader}>
              <View style={styles.timeTag}>
                <Timer size={14} color={Colors.primary600} />
                <Text style={styles.timeText}>In 15 Minutes</Text>
              </View>
              <View style={styles.ratingRow}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingVal}>4.9 Regular</Text>
              </View>
            </View>
            
            <View style={styles.clientRow}>
              <View style={styles.clientAvatar}>
                <Text style={styles.avatarText}>{nextBooking.user?.name?.charAt(0)}</Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{nextBooking.user?.name || 'Customer'}</Text>
                <Text style={styles.serviceText}>{nextBooking.services?.[0]?.name || 'Premium Service'}</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Calendar size={24} color={Colors.gray400} />
            <Text style={styles.emptyCardText}>No upcoming appointments just yet</Text>
          </View>
        )}

        {/* Rapid Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <View style={[styles.metricIcon, { backgroundColor: '#EFF6FF' }]}>
              <Users size={20} color="#3B82F6" />
            </View>
            <Text style={styles.metricVal}>{statsQuery.data?.todayBookings || 0}</Text>
            <Text style={styles.metricLab}>Clients Today</Text>
          </View>
          
          <View style={styles.metricItem}>
            <View style={[styles.metricIcon, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={20} color="#10B981" />
            </View>
            <Text style={styles.metricVal}>{statsQuery.data?.completedToday || 0}</Text>
            <Text style={styles.metricLab}>Finished</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={[styles.metricIcon, { backgroundColor: '#F5F3FF' }]}>
              <IndianRupee size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.metricVal}>₹2,450</Text>
            <Text style={styles.metricLab}>Earnings Today</Text>
          </View>
        </View>

        {/* Pending Queue */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Priority Queue</Text>
        <View style={styles.queueList}>
          {(nextBookingsQuery.data || []).slice(1).map((item: any, idx: number) => (
            <TouchableOpacity key={item.id} style={styles.queueItem}>
              <View style={styles.queueTime}>
                <Text style={styles.queueTimeText}>{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <View style={styles.queueLine} />
              </View>
              <View style={styles.queueContent}>
                <Text style={styles.queueName}>{item.user?.name}</Text>
                <Text style={styles.queueService}>{item.services?.[0]?.name}</Text>
              </View>
              <Badge text={item.status} size="sm" />
            </TouchableOpacity>
          ))}
          {(nextBookingsQuery.data?.length || 0) <= 1 && (
            <Text style={styles.queueEmptyHint}>Your queue is currently clear.</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  header: {
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary600,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  shiftCard: {
    marginTop: 20,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  shopName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 16,
  },
  nextCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
  },
  nextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary600,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#64748B',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'flex-start',
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLab: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queueList: {
    gap: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  queueTime: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  queueTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  queueLine: {
    width: 2,
    height: 20,
    backgroundColor: '#F1F5F9',
    marginTop: 4,
  },
  queueContent: {
    flex: 1,
  },
  queueName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  queueService: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  queueEmptyHint: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  }
});
