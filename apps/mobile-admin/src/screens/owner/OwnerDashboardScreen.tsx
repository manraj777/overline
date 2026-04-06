import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows } from '../../theme';
import { 
  BarChart3, 
  Users, 
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  UserCheck,
  Briefcase,
  PieChart,
  ArrowUpRight,
  Percent
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useSocketEvent } from '../../hooks/useSocket';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OwnerDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { selectedShopId, user } = useAuthStore();
  
  const [newBookingAlert, setNewBookingAlert] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;

  const {
    data: stats,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['ownerDashboardStats', selectedShopId],
    queryFn: () => dashboardApi.getStats(selectedShopId!).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const incompleteEarnings = Math.max(
    0,
    Number(stats?.pendingRevenue ?? stats?.incompleteEarnings ?? 0),
  );

  useSocketEvent('booking_new', (booking) => {
    setNewBookingAlert(booking);
    queryClient.invalidateQueries({ queryKey: ['ownerDashboardStats'] });
    Animated.spring(slideAnim, { toValue: 20, useNativeDriver: true, tension: 50, friction: 7 }).start();
    setTimeout(() => {
      Animated.timing(slideAnim, { toValue: -150, duration: 300, useNativeDriver: true }).start(() => setNewBookingAlert(null));
    }, 5000);
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Real-time Alert Toast */}
      {newBookingAlert && (
        <Animated.View style={[styles.alertToast, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.alertIcon}><Sparkles size={18} color="#FFF" /></View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Instant Queue Alert</Text>
            <Text style={styles.alertDesc}>{newBookingAlert.customerName} just booked a slot.</Text>
          </View>
        </Animated.View>
      )}

      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Business Performance</Text>
            <Text style={styles.shopName}>{user?.name?.split(' ')[0]}'s Empire</Text>
          </View>
          <View style={styles.headerRight}>
            <PieChart size={24} color="rgba(255,255,255,0.4)" />
          </View>
        </View>

        <View style={styles.revenueCard}>
          <Text style={styles.revLabel}>TOTAL GROSS EARNINGS</Text>
          <View style={styles.revRow}>
            <Text style={styles.revValue}>₹{(stats?.totalRevenue || stats?.todayRevenue || 0).toLocaleString()}</Text>
            <View style={styles.revTrend}>
              <TrendingUp size={12} color="#10B981" />
              <Text style={styles.revTrendText}>+18%</Text>
            </View>
          </View>
          <View style={styles.revProgress}>
            <View style={[styles.revBar, { width: '75%' }]} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.main} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        <Text style={styles.sectionTitle}>Real-time Queue Analysis</Text>
        <View style={styles.queueStats}>
          <View style={[styles.qItem, { backgroundColor: '#EFF6FF' }]}>
            <Clock size={20} color="#3B82F6" />
            <Text style={styles.qVal}>{stats?.pendingBookings || 0}</Text>
            <Text style={styles.qLabel}>WAITING NOW</Text>
          </View>
          <View style={[styles.qItem, { backgroundColor: '#F0FDF4' }]}>
            <UserCheck size={20} color="#10B981" />
            <Text style={styles.qVal}>{stats?.completedToday || 0}</Text>
            <Text style={styles.qLabel}>SERVICED TODAY</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Client Metrics</Text>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statSmallLabel}>TOTAL CLIENTS</Text>
            <View style={styles.statMainRow}>
              <Text style={styles.statVal}>{stats?.totalBookings || 0}</Text>
              <Users size={16} color="#94A3B8" />
            </View>
            <Text style={styles.statSubText}>Booked for services</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statSmallLabel}>CUMULATIVE SERVICES</Text>
            <View style={styles.statMainRow}>
              <Text style={styles.statVal}>{stats?.totalServices || 12}</Text>
              <Briefcase size={16} color="#94A3B8" />
            </View>
            <Text style={styles.statSubText}>Booked this month</Text>
          </View>
        </View>

        <View style={styles.incompleteCard}>
          <Text style={styles.incompleteLabel}>INCOMPLETE EARNINGS</Text>
          <Text style={styles.incompleteValue}>₹{incompleteEarnings.toLocaleString()}</Text>
          <Text style={styles.incompleteSub}>Pending completion or settlement</Text>
        </View>

        <Text style={styles.sectionTitle}>Business Analysis</Text>
        <TouchableOpacity
          style={styles.analysisBtn}
          onPress={() => {
            if (!selectedShopId) {
              return;
            }
            navigation.navigate('Analytics', { shopId: selectedShopId });
          }}
        >
          <View style={styles.analysisIcon}>
            <BarChart3 size={20} color={Colors.primary} />
          </View>
          <View style={styles.analysisMeta}>
            <Text style={styles.analysisTitle}>Complete Earning Analysis</Text>
            <Text style={styles.analysisSubtitle}>View deep insights into revenue & occupancy.</Text>
          </View>
          <ArrowUpRight size={18} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={styles.insightBox}>
          <View style={styles.insightHeader}>
            <Percent size={14} color={Colors.primary} />
            <Text style={styles.insightTitle}>GROWTH INSIGHT</Text>
          </View>
          <Text style={styles.insightBody}>
            Your shop is handling 15% more bookings than last week. Consider adding more staff during peak hours (1 PM - 4 PM).
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alertToast: {
    position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#0F172A',
    borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', zIndex: 1000, ...Shadows.lg,
  },
  alertIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  alertContent: { flex: 1 },
  alertTitle: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  alertDesc: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  header: {
    backgroundColor: '#0F172A', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingHorizontal: 24, paddingBottom: 40,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  greeting: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  shopName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  headerRight: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  revenueCard: { marginTop: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 30, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  revLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  revRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12, gap: 12 },
  revValue: { color: '#FFF', fontSize: 40, fontWeight: '900' },
  revTrend: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  revTrendText: { color: '#10B981', fontSize: 11, fontWeight: '900' },
  revProgress: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 24 },
  revBar: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  main: { padding: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 16, marginTop: 8 },
  queueStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  qItem: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  qVal: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  qLabel: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 1, marginTop: 4 },
  statGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  statSmallLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  statMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statVal: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  statSubText: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
  analysisBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm, marginBottom: 20 },
  analysisIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  analysisMeta: { flex: 1 },
  analysisTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  analysisSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  insightBox: { backgroundColor: '#F1F5F9', padding: 20, borderRadius: 24, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { fontSize: 10, fontWeight: '900', color: Colors.primary, letterSpacing: 1 },
  insightBody: { fontSize: 12, color: '#475569', lineHeight: 18, fontWeight: '600' },
  incompleteCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 20,
  },
  incompleteLabel: { fontSize: 10, fontWeight: '900', color: '#9A3412', letterSpacing: 1 },
  incompleteValue: { fontSize: 28, fontWeight: '900', color: '#7C2D12', marginTop: 6 },
  incompleteSub: { fontSize: 11, color: '#C2410C', fontWeight: '600', marginTop: 4 },
});
