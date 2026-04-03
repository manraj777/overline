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

export default function MyEarningsScreen() {
  const {selectedShopId} = useAuthStore();
  const [period, setPeriod] = useState<Period>('30d');

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const {data, isLoading, isRefetching, refetch} = useQuery({
    queryKey: ['staffMyEarnings', selectedShopId, period],
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

  const estimatedShare = Math.round((data?.totalRevenue || 0) * 0.3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Earnings</Text>
        <Text style={styles.subtitle}>Performance-linked estimate</Text>
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

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Estimated share</Text>
          <Text style={styles.heroValue}>Rs {estimatedShare.toLocaleString()}</Text>
          <Text style={styles.heroHint}>Based on recent shop revenue trend</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{data?.completedBookings || 0}</Text>
            <Text style={styles.metricLabel}>Completed Jobs</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{(data?.averageRating || 0).toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
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
  emptyText: {fontSize: FontSize.h3, color: Colors.textSecondary, textAlign: 'center'},
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
  heroCard: {
    borderRadius: Radius.lg,
    backgroundColor: '#0F766E',
    padding: Spacing.lg,
  },
  heroLabel: {fontSize: FontSize.body, color: '#CCFBF1'},
  heroValue: {marginTop: 4, fontSize: FontSize.display, fontWeight: FontWeight.bold, color: Colors.white},
  heroHint: {marginTop: 6, fontSize: FontSize.body, color: '#99F6E4'},
  metricsRow: {marginTop: Spacing.lg, flexDirection: 'row', gap: Spacing.md},
  metricCard: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
  },
  metricValue: {fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: Colors.textPrimary},
  metricLabel: {marginTop: 4, fontSize: FontSize.body, color: Colors.textSecondary},
});
