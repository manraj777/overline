import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../theme';
import { 
  ChartColumn, 
  CreditCard, 
  Users, 
  Bell, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useSocketEvent } from '../../hooks/useSocket';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OwnerDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { selectedShopId, user } = useAuthStore();
  
  const [newBookingAlert, setNewBookingAlert] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;

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

  // Listen for new bookings real-time
  useSocketEvent('booking_new', (booking) => {
    setNewBookingAlert(booking);
    queryClient.invalidateQueries({ queryKey: ['ownerDashboardStats'] });
    
    // Animate in
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setNewBookingAlert(null));
    }, 5000);
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Select a shop to view owner dashboard</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Real-time Alert Toast */}
      {newBookingAlert && (
        <Animated.View style={[styles.alertToast, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.alertIcon}>
            <Sparkles size={20} color="#FFF" />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>New Booking Confirmed!</Text>
            <Text style={styles.alertDesc}>{newBookingAlert.customerName} booked for {new Date(newBookingAlert.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <TouchableOpacity onPress={() => setNewBookingAlert(null)}>
            <Text style={styles.alertAction}>DISMISS</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>Good Morning,</Text>
            <Text style={styles.title}>{user?.name?.split(' ')[0] || 'Owner'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Bell size={22} color="#FFF" />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.revenueSummary}>
          <Text style={styles.revenueLabel}>Today's Est. Revenue</Text>
          <View style={styles.revenueRow}>
            <Text style={styles.revenueValue}>₹{(stats?.todayRevenue || 0).toLocaleString()}</Text>
            <View style={styles.trendRow}>
              <TrendingUp size={14} color="#4ADE80" />
              <Text style={styles.trendText}>+12.5%</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
          />
        }>
        
        <Text style={styles.sectionTitle}>Operations Overview</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, {backgroundColor: '#EFF6FF'}]}>
              <Clock size={20} color="#3B82F6" />
            </View>
            <Text style={styles.kpiValue}>{stats?.todayBookings || 0}</Text>
            <Text style={styles.kpiLabel}>Bookings</Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, {backgroundColor: '#FFF7ED'}]}>
              <Users size={20} color="#F97316" />
            </View>
            <Text style={styles.kpiValue}>{stats?.pendingBookings || 0}</Text>
            <Text style={styles.kpiLabel}>In Queue</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, {backgroundColor: '#F0FDF4'}]}>
              <CheckCircle2 size={20} color="#10B981" />
            </View>
            <Text style={styles.kpiValue}>{stats?.completedToday || 0}</Text>
            <Text style={styles.kpiLabel}>Finished</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, {backgroundColor: '#F5F3FF'}]}>
              <TrendingUp size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.kpiValue}>92%</Text>
            <Text style={styles.kpiLabel}>Occupancy</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, {marginTop: 32}]}>Manage Business</Text>
        <View style={styles.shortcutsList}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('StaffManagement', {shopId: selectedShopId})}>
            <View style={styles.actionInfo}>
              <View style={[styles.actionIcon, {backgroundColor: '#ECFDF5'}]}>
                <Users size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Team Management</Text>
                <Text style={styles.actionDesc}>Manage specialist schedules and roles</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Analytics', {shopId: selectedShopId})}>
            <View style={styles.actionInfo}>
              <View style={[styles.actionIcon, {backgroundColor: '#F0F9FF'}]}>
                <ChartColumn size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Business Analytics</Text>
                <Text style={styles.actionDesc}>View revenue trends and performance</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('PayoutDetails', {shopId: selectedShopId})}>
            <View style={styles.actionInfo}>
              <View style={[styles.actionIcon, {backgroundColor: '#FFF1F2'}]}>
                <CreditCard size={20} color="#E11D48" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Settlements</Text>
                <Text style={styles.actionDesc}>Check payouts and pending balance</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        <View style={{height: 100}} />
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
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.h3,
    textAlign: 'center',
  },
  alertToast: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    ...Shadows.md,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  alertDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  alertAction: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 12,
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 4,
    color: '#FFF',
    fontWeight: '900',
    fontSize: 32,
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  revenueSummary: {
    marginTop: 32,
  },
  revenueLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 4,
  },
  revenueValue: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '800',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  trendText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  shortcutsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
