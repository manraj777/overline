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
import {format, subDays} from 'date-fns';
import {useQuery} from '@tanstack/react-query';
import {analyticsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

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

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Select a shop to view earnings</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>Owner Earnings</Text>
        <Text style={styles.subtitle}>Revenue and conversion snapshot</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
          />
        }>
        <View style={styles.filterRow}>
          {(['7d', '30d', '90d'] as Period[]).map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, item === period && styles.filterChipActive]}
              onPress={() => setPeriod(item)}>
              <Text style={[styles.filterChipText, item === period && styles.filterChipTextActive]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.primaryCard}>
          <Text style={styles.primaryLabel}>Total Revenue</Text>
          <Text style={styles.primaryValue}>Rs {(data?.totalRevenue || 0).toLocaleString()}</Text>
          <Text style={styles.primaryMeta}>
            {data?.completedBookings || 0} completed of {data?.totalBookings || 0} bookings
          </Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Cancelled</Text>
            <Text style={styles.kpiValue}>{data?.cancelledBookings || 0}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Avg Rating</Text>
            <Text style={styles.kpiValue}>{(data?.averageRating || 0).toFixed(1)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
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
  header: {
    backgroundColor: Colors.white,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
  subtitle: {marginTop: 2, fontSize: FontSize.body, color: Colors.textSecondary},
  content: {padding: Spacing.lg},
  filterRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg},
  filterChip: {
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterChipActive: {backgroundColor: Colors.primary},
  filterChipText: {fontSize: FontSize.label, color: Colors.textSecondary, fontWeight: FontWeight.medium},
  filterChipTextActive: {color: Colors.white},
  primaryCard: {
    backgroundColor: Colors.primary700,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  primaryLabel: {color: Colors.primary100, fontSize: FontSize.body},
  primaryValue: {
    marginTop: 4,
    color: Colors.white,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
  },
  primaryMeta: {marginTop: 6, color: Colors.primary100, fontSize: FontSize.body},
  kpiRow: {marginTop: Spacing.lg, flexDirection: 'row', gap: Spacing.md},
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderColor: Colors.gray100,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  kpiTitle: {fontSize: FontSize.body, color: Colors.textSecondary},
  kpiValue: {marginTop: 4, fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
});
