import React, {useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {format, subDays} from 'date-fns';
import {analyticsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

type Period = '7d' | '30d' | '90d';

interface AnalyticsSummary {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
}

export default function AnalyticsTabScreen() {
  const {selectedShopId} = useAuthStore();
  const [period, setPeriod] = useState<Period>('30d');

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const {
    data: summary,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AnalyticsSummary>({
    queryKey: ['analyticsTabSummary', selectedShopId, period],
    queryFn: () => analyticsApi.getSummary(selectedShopId!, {startDate, endDate}).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const statCards = [
    {label: 'Revenue', value: `₹${(summary?.totalRevenue || 0).toLocaleString()}`},
    {label: 'Bookings', value: `${summary?.totalBookings || 0}`},
    {label: 'Completed', value: `${summary?.completedBookings || 0}`},
    {label: 'Cancelled', value: `${summary?.cancelledBookings || 0}`},
    {label: 'Avg Rating', value: `${(summary?.averageRating || 0).toFixed(1)} / 5`},
  ];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to view analytics</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
        }>
        <View style={styles.filterRow}>
          {(['7d', '30d', '90d'] as Period[]).map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, period === item && styles.filterChipActive]}
              onPress={() => setPeriod(item)}>
              <Text style={[styles.filterText, period === item && styles.filterTextActive]}>
                {item === '7d' ? '7 Days' : item === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {statCards.map(card => (
          <View key={card.label} style={styles.card}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardValue}>{card.value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    fontSize: FontSize.body,
  },
  filterTextActive: {
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.body,
  },
  cardValue: {
    marginTop: 4,
    color: Colors.textPrimary,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.semibold,
  },
  emptyTitle: {
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
});
