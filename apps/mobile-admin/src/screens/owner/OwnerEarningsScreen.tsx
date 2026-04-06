import React, {useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {format, subDays} from 'date-fns';
import {useQuery} from '@tanstack/react-query';
import {analyticsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  Info,
  DollarSign,
  PieChart as PieChartIcon,
  CreditCard
} from 'lucide-react-native';

const {width} = Dimensions.get('window');

type Period = '7d' | '30d' | '90d';

export default function OwnerEarningsScreen() {
  const {selectedShopId} = useAuthStore();
  const [period, setPeriod] = useState<Period>('30d');

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const {data, isLoading, isRefetching, refetch} = useQuery({
    queryKey: ['ownerEarningsSummary', selectedShopId, period],
    queryFn: () =>
      analyticsApi
        .getSummary(selectedShopId!, {startDate, endDate})
        .then(res => res.data),
    enabled: !!selectedShopId,
  });

  const {data: dailyData} = useQuery({
    queryKey: ['ownerDailyEarnings', selectedShopId, period],
    queryFn: () =>
      analyticsApi
        .getDaily(selectedShopId!, {startDate, endDate})
        .then(res => res.data),
    enabled: !!selectedShopId,
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Wallet size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>Select a shop to view earnings</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const netEarnings = data?.totalRevenue || 0;
  const platformFee = netEarnings * 0.1; // Simulated 10%
  const staffComm = netEarnings * 0.3; // Simulated 30%
  const takeHome = netEarnings - platformFee - staffComm;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Text style={styles.headerSubtitle}>Manage your business finances</Text>
          </View>
          <TouchableOpacity style={styles.payoutButton}>
            <View style={styles.payoutBadge} />
            <CreditCard size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={["#3B82F6"]} />
          }
        >
          {/* Period Selector */}
          <View style={styles.periodRow}>
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, period === p && styles.periodChipActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Main Earnings Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View style={styles.walletIcon}>
                <Wallet size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.mainCardLabel}>Total Revenue</Text>
            </View>
            <Text style={styles.mainCardValue}>₹{netEarnings.toLocaleString()}</Text>
            <View style={styles.trendRow}>
              <View style={styles.trendBadge}>
                <ArrowUpRight size={14} color="#10B981" />
                <Text style={styles.trendText}>+12.5%</Text>
              </View>
              <Text style={styles.trendPeriod}>than last {period}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Bookings</Text>
                <Text style={styles.statValue}>{data?.completedBookings || 0}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg Ticket</Text>
                <Text style={styles.statValue}>₹{(netEarnings / (data?.completedBookings || 1)).toFixed(0)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>{(data?.averageRating || 0).toFixed(1)}</Text>
              </View>
            </View>
          </View>

          {/* Breakdown Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            <Info size={16} color="#94A3B8" />
          </View>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, {backgroundColor: '#3B82F6'}]} />
              <Text style={styles.breakdownLabel}>Total Revenue</Text>
              <Text style={styles.breakdownValue}>₹{netEarnings.toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, {backgroundColor: '#64748B'}]} />
              <Text style={styles.breakdownLabel}>Platform Fee (10%)</Text>
              <Text style={[styles.breakdownValue, {color: '#EF4444'}]}>- ₹{platformFee.toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, {backgroundColor: '#94A3B8'}]} />
              <Text style={styles.breakdownLabel}>Staff Commission</Text>
              <Text style={[styles.breakdownValue, {color: '#EF4444'}]}>- ₹{staffComm.toLocaleString()}</Text>
            </View>
            <View style={[styles.divider, {marginVertical: 12}]} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownLabel, {fontWeight: '700', color: '#0F172A'}]}>Net Take Home</Text>
              <Text style={[styles.breakdownValue, {fontSize: 18, color: '#10B981', fontWeight: '800'}]}>₹{takeHome.toLocaleString()}</Text>
            </View>
          </View>

          {/* Daily Trend (Simple Bars) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Volume Trend</Text>
            <TrendingUp size={16} color="#94A3B8" />
          </View>
          
          <View style={styles.chartCard}>
            <View style={styles.barContainer}>
              {[40, 60, 30, 80, 50, 70, 45].map((h, i) => (
                <View key={i} style={styles.barWrapper}>
                  <View style={[styles.bar, {height: `${h}%`}]} />
                  <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent Settlements */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {[1, 2, 3].map(i => (
            <View key={i} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <ArrowDownRight size={20} color="#10B981" />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>Booking #BK{2000 + i}</Text>
                <Text style={styles.transactionDate}>{format(subDays(new Date(), i), 'MMM dd, hh:mm a')}</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.amountText}>+₹{500 * i}</Text>
                <Text style={styles.statusText}>Settled</Text>
              </View>
            </View>
          ))}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  payoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  payoutBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
    zIndex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTextActive: {
    color: '#0F172A',
  },
  mainCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainCardLabel: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  mainCardValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  trendText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  trendPeriod: {
    color: '#94A3B8',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barWrapper: {
    alignItems: 'center',
    width: 24,
  },
  bar: {
    width: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  transactionDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
