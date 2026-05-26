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
  Image,
  StatusBar,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, bookingsApi, shopApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows, Radius } from '../../theme';
import { 
  Clock, 
  Users, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  Calendar,
  IndianRupee,
  BarChart3,
  Search,
  ScanLine
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSocketEvent } from '../../hooks/useSocket';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function MyDayScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { selectedShopId, user } = useAuthStore();

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

  const shopQuery = useQuery({
    queryKey: ['staffSelectedShop', selectedShopId],
    queryFn: () => shopApi.getById(selectedShopId!).then(res => res.data),
    enabled: !!selectedShopId,
  });

  useSocketEvent('booking_new', () => {
    queryClient.invalidateQueries({ queryKey: ['staffMyDayStats'] });
    queryClient.invalidateQueries({ queryKey: ['staffNextBookings'] });
  });

  if (statsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const nextBooking = nextBookingsQuery.data?.[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Immersive Shop Header */}
      <View style={styles.hero}>
        <Image 
          source={{ uri: shopQuery.data?.coverUrl || shopQuery.data?.coverPhotoUrl || shopQuery.data?.logoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1000' }} 
          style={styles.heroImage} 
        />
        <View style={styles.heroOverlay} />
        <SafeAreaView style={styles.heroContent} edges={['top']}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.shopName}>{shopQuery.data?.name || 'Your Assigned Shop'}</Text>
              <Text style={styles.staffWelcome}>Welcome back, {user?.name?.split(' ')[0]}</Text>
            </View>
            <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('VerifyCode')}>
              <ScanLine size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.main} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={statsQuery.isRefetching} onRefresh={() => { statsQuery.refetch(); nextBookingsQuery.refetch(); }} />}
      >
        <View style={styles.earningsCard}>
          <View style={styles.earnInfo}>
            <Text style={styles.earnLabel}>SHIFT EARNINGS</Text>
            <Text style={styles.earnValue}>₹{(statsQuery.data?.todayRevenue || 1240).toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.analysisBtn} onPress={() => navigation.navigate('Analytics')}>
            <BarChart3 size={18} color="#FFF" />
            <Text style={styles.analysisBtnText}>ANALYZE</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Current Engagement</Text>
        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: '#EFF6FF' }]}>
            <Users size={22} color="#3B82F6" />
            <Text style={styles.statusVal}>{statsQuery.data?.pendingBookings || 0}</Text>
            <Text style={styles.statusLabel}>IN QUEUE</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle2 size={22} color="#10B981" />
            <Text style={styles.statusVal}>{statsQuery.data?.completedToday || 0}</Text>
            <Text style={styles.statusLabel}>FINISHED</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Next Appointment</Text>
        {nextBooking ? (
          <TouchableOpacity style={styles.activeBooking} onPress={() => navigation.navigate('BookingDetail', { id: nextBooking.id })}>
            <View style={styles.bookingLeft}>
              <View style={styles.bookingAvatar}>
                <Text style={styles.bookingAvatarText}>{nextBooking.user?.name?.charAt(0)}</Text>
              </View>
              <View style={styles.bookingMeta}>
                <Text style={styles.bookingClient}>{nextBooking.user?.name}</Text>
                <Text style={styles.bookingService}>{nextBooking.services?.[0]?.name}</Text>
                <View style={styles.bookingTimeRow}>
                  <Clock size={12} color="#64748B" />
                  <Text style={styles.bookingTime}>04:30 PM - 05:00 PM</Text>
                </View>
              </View>
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ) : (
          <View style={styles.empty}>
            <Calendar size={32} color="#CBD5E1" strokeWidth={1} />
            <Text style={styles.emptyText}>No upcoming bookings for this shift.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Future Bookings</Text>
        {[1, 2].map((i) => (
          <View key={i} style={styles.futureItem}>
            <View style={styles.futureDate}>
              <Text style={styles.futureDay}>APR</Text>
              <Text style={styles.futureNum}>0{i+6}</Text>
            </View>
            <View style={styles.futureDetails}>
              <Text style={styles.futureCount}>{i === 1 ? '4' : '6'} Appointments Scheduled</Text>
              <Text style={styles.futureTarget}>Target Earning: ₹3,200</Text>
            </View>
            <TouchableOpacity style={styles.futureView}>
              <Search size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: 180, overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  heroContent: { position: 'absolute', inset: 0, paddingHorizontal: 24, paddingVertical: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shopName: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 },
  staffWelcome: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  scanBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  main: { paddingHorizontal: 24, paddingTop: 24 },
  earningsCard: { backgroundColor: Colors.primary, borderRadius: 32, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadows.glow, marginBottom: 32 },
  earnInfo: { flex: 1 },
  earnLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  earnValue: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 4 },
  analysisBtn: { backgroundColor: 'rgba(0,0,0,0.15)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  analysisBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 16 },
  statusGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statusCard: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statusVal: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginVertical: 8 },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
  activeBooking: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm, marginBottom: 24 },
  bookingLeft: { flexDirection: 'row', alignItems: 'center' },
  bookingAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  bookingAvatarText: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  bookingMeta: { marginLeft: 16 },
  bookingClient: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  bookingService: { fontSize: 12, fontWeight: '700', color: '#64748B', marginVertical: 2 },
  bookingTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  bookingTime: { fontSize: 11, color: '#94A3B8', fontWeight: '800' },
  empty: { padding: 40, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#F1F5F9', marginBottom: 24 },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginTop: 12 },
  futureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  futureDate: { width: 44, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9', paddingRight: 16, marginRight: 16 },
  futureDay: { fontSize: 9, fontWeight: '900', color: '#94A3B8' },
  futureNum: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  futureDetails: { flex: 1 },
  futureCount: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  futureTarget: { fontSize: 11, color: '#10B981', fontWeight: '800', marginTop: 2 },
  futureView: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center' },
});
