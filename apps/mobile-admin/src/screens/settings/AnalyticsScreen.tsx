import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useRoute, RouteProp} from '@react-navigation/native';
import {format, subDays} from 'date-fns';
import {analyticsApi} from '../../api/client';
import {RootStackParamList} from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'Analytics'>;

interface AnalyticsSummary {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
  newCustomers: number;
}

interface DailyData {
  date: string;
  bookings: number;
  revenue: number;
  completed: number;
  cancelled: number;
}

interface ServiceAnalytics {
  serviceId: string;
  serviceName: string;
  totalBookings: number;
  totalRevenue: number;
  averageDuration: number;
}

type TimePeriod = '7d' | '30d' | '90d';

export default function AnalyticsScreen() {
  const route = useRoute<RouteProps>();
  const {shopId} = route.params;
  const [period, setPeriod] = useState<TimePeriod>('30d');

  const getDateRange = () => {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    return {startDate, endDate};
  };

  const {startDate, endDate} = getDateRange();

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery<AnalyticsSummary>({
    queryKey: ['analyticsSummary', shopId, period],
    queryFn: () =>
      analyticsApi
        .getSummary(shopId, {startDate, endDate})
        .then(res => res.data),
    enabled: !!shopId,
  });

  const {data: dailyData = []} = useQuery<DailyData[]>({
    queryKey: ['analyticsDaily', shopId, period],
    queryFn: () =>
      analyticsApi
        .getDaily(shopId, {startDate, endDate})
        .then(res => res.data || []),
    enabled: !!shopId,
  });

  const {data: serviceData = []} = useQuery<ServiceAnalytics[]>({
    queryKey: ['analyticsServices', shopId],
    queryFn: () =>
      analyticsApi.getServices(shopId).then(res => res.data || []),
    enabled: !!shopId,
  });

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

  if (summaryLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingSummary}
            onRefresh={() => refetchSummary()}
          />
        }>
        {/* Period Filter */}
        <View style={styles.periodFilter}>
          {(['7d', '30d', '90d'] as TimePeriod[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodChip,
                period === p && styles.periodChipActive,
              ]}
              onPress={() => setPeriod(p)}>
              <Text
                style={[
                  styles.periodChipText,
                  period === p && styles.periodChipTextActive,
                ]}>
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.revenueCard]}>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <Text style={[styles.cardValue, styles.revenueValue]}>
              ₹{(summary?.totalRevenue || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Total Bookings</Text>
            <Text style={styles.cardValue}>
              {summary?.totalBookings || 0}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Completed</Text>
            <Text style={[styles.cardValue, {color: '#10B981'}]}>
              {summary?.completedBookings || 0}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Cancelled</Text>
            <Text style={[styles.cardValue, {color: '#EF4444'}]}>
              {summary?.cancelledBookings || 0}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Avg Rating</Text>
            <Text style={styles.cardValue}>
              ⭐ {(summary?.averageRating || 0).toFixed(1)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>New Customers</Text>
            <Text style={styles.cardValue}>
              {summary?.newCustomers || 0}
            </Text>
          </View>
        </View>

        {/* Revenue Chart (Simple bar chart) */}
        {dailyData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chart}>
                {dailyData.slice(-14).map((day, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(
                            (day.revenue / maxRevenue) * 120,
                            4,
                          ),
                        },
                      ]}
                    />
                    <Text style={styles.chartLabel}>
                      {format(new Date(day.date), 'dd')}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Bookings Chart */}
        {dailyData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Bookings Trend</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chart}>
                {dailyData.slice(-14).map((day, index) => {
                  const maxBookings = Math.max(
                    ...dailyData.map(d => d.bookings),
                    1,
                  );
                  return (
                    <View key={index} style={styles.chartBar}>
                      <View
                        style={[
                          styles.bar,
                          styles.bookingsBar,
                          {
                            height: Math.max(
                              (day.bookings / maxBookings) * 120,
                              4,
                            ),
                          },
                        ]}
                      />
                      <Text style={styles.chartLabel}>
                        {format(new Date(day.date), 'dd')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Top Services */}
        {serviceData.length > 0 && (
          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            {serviceData.slice(0, 10).map((service, index) => (
              <View key={service.serviceId} style={styles.serviceRow}>
                <View style={styles.serviceRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.serviceName}</Text>
                  <Text style={styles.serviceStats}>
                    {service.totalBookings} bookings · ₹
                    {service.totalRevenue.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.serviceRevenue}>
                  <Text style={styles.serviceRevenueText}>
                    ₹{service.totalRevenue.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{height: 40}} />
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
  periodFilter: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodChipTextActive: {
    color: '#fff',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexGrow: 1,
    flexBasis: '45%',
  },
  revenueCard: {
    width: '100%',
    flexBasis: '100%',
    backgroundColor: '#4F46E5',
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  revenueValue: {
    color: '#fff',
    fontSize: 28,
  },
  chartSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    paddingBottom: 8,
    gap: 8,
    minHeight: 180,
  },
  chartBar: {
    alignItems: 'center',
    width: 32,
  },
  bar: {
    width: 24,
    backgroundColor: '#4F46E5',
    borderRadius: 4,
    marginBottom: 8,
  },
  bookingsBar: {
    backgroundColor: '#10B981',
  },
  chartLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  servicesSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  serviceStats: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  serviceRevenue: {
    alignItems: 'flex-end',
  },
  serviceRevenueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
});
