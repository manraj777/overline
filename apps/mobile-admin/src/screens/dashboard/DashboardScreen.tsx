import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {format} from 'date-fns';
import {dashboardApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {RootStackParamList, DashboardStats, Booking} from '../../types';
import {CalendarDays, CircleCheck, Cog, Scissors, Store} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {user, selectedShopId} = useAuthStore();

  const selectedShop = user?.shops?.find(s => s.id === selectedShopId);

  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats', selectedShopId],
    queryFn: () =>
      dashboardApi.getStats(selectedShopId!).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const {
    data: todayBookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ['todayBookings', selectedShopId],
    queryFn: () =>
      dashboardApi
        .getBookings(selectedShopId!, {date: today, limit: 10})
        .then(res => res.data?.bookings || res.data || []),
    enabled: !!selectedShopId,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchBookings();
  };

  const statusColors: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#10B981',
    IN_PROGRESS: '#3B82F6',
    COMPLETED: '#10B981',
    CANCELLED: '#EF4444',
  };

  const isLoading = statsLoading || bookingsLoading;

  if (isLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => navigation.navigate('VerifyCode')}>
          <Text style={styles.verifyButtonText}>Verify Code</Text>
        </TouchableOpacity>
      </View>

      {/* Shop Selector */}
      {selectedShop && (
        <View style={styles.shopBadge}>
          <Store size={18} color="#4F46E5" style={styles.shopBadgeIcon} />
          <Text style={styles.shopBadgeName}>{selectedShop.name}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={['#4F46E5']}
          />
        }>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.todayBookings || 0}</Text>
            <Text style={styles.statLabel}>Today's Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats?.todayRevenue || 0}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWarning]}>
            <Text style={styles.statValue}>{stats?.pendingBookings || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={styles.statValue}>{stats?.completedToday || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Weekly Comparison */}
        {stats?.weeklyComparison && (
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonTitle}>vs Last Week</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text
                  style={[
                    styles.comparisonValue,
                    stats.weeklyComparison.bookingsChange >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}>
                  {stats.weeklyComparison.bookingsChange >= 0 ? '+' : ''}
                  {stats.weeklyComparison.bookingsChange}%
                </Text>
                <Text style={styles.comparisonLabel}>Bookings</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text
                  style={[
                    styles.comparisonValue,
                    stats.weeklyComparison.revenueChange >= 0
                      ? styles.positive
                      : styles.negative,
                  ]}>
                  {stats.weeklyComparison.revenueChange >= 0 ? '+' : ''}
                  {stats.weeklyComparison.revenueChange}%
                </Text>
                <Text style={styles.comparisonLabel}>Revenue</Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main' as any, {screen: 'Bookings'})}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {todayBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarDays size={34} color="#9CA3AF" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No bookings for today</Text>
            </View>
          ) : (
            todayBookings.slice(0, 5).map(booking => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                onPress={() =>
                  navigation.navigate('BookingDetail', {bookingId: booking.id})
                }>
                <View style={styles.bookingTime}>
                  <Text style={styles.bookingTimeText}>
                    {format(new Date(booking.startTime), 'h:mm')}
                  </Text>
                  <Text style={styles.bookingAmPm}>
                    {format(new Date(booking.startTime), 'a')}
                  </Text>
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingCustomer}>{booking.user?.name}</Text>
                  <Text style={styles.bookingServices}>
                    {booking.services?.map(s => s.serviceName).join(', ')}
                  </Text>
                  <Text style={styles.bookingCode}>
                    Code: {booking.verificationCode}
                  </Text>
                </View>
                <View
                  style={[
                    styles.bookingStatus,
                    {
                      backgroundColor:
                        (statusColors[booking.status] || '#6B7280') + '20',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.bookingStatusText,
                      {color: statusColors[booking.status] || '#6B7280'},
                    ]}>
                    {booking.status.replace('_', ' ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('VerifyCode')}>
              <CircleCheck size={20} color="#4F46E5" style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Verify Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate('Main' as any, {screen: 'Queue'})
              }>
              <Scissors size={20} color="#4F46E5" style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate('ShopSettings', {
                  shopId: selectedShopId || '',
                })
              }>
              <Cog size={20} color="#4F46E5" style={styles.actionIcon} />
              <Text style={styles.actionLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{height: 32}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  verifyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  shopBadgeIcon: {
    marginRight: 8,
  },
  shopBadgeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  comparisonCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
  },
  bookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingTime: {
    alignItems: 'center',
    marginRight: 16,
  },
  bookingTimeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  bookingAmPm: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  bookingServices: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  bookingCode: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  bookingStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  actionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
});
