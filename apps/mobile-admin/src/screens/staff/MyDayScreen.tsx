import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {dashboardApi, bookingsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

export default function MyDayScreen() {
  const {selectedShopId} = useAuthStore();

  const statsQuery = useQuery({
    queryKey: ['staffMyDayStats', selectedShopId],
    queryFn: () => dashboardApi.getStats(selectedShopId!).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const approvalsQuery = useQuery({
    queryKey: ['staffPendingApprovals', selectedShopId],
    queryFn: () =>
      bookingsApi
        .getAll(selectedShopId!, {status: 'PENDING_APPROVAL'})
        .then(res => res.data?.bookings || res.data || []),
    enabled: !!selectedShopId,
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Select a shop to view your day</Text>
      </View>
    );
  }

  if (statsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Day</Text>
        <Text style={styles.subtitle}>Shift and queue snapshot</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={statsQuery.isRefetching || approvalsQuery.isRefetching}
            onRefresh={() => {
              statsQuery.refetch();
              approvalsQuery.refetch();
            }}
            colors={[Colors.primary]}
          />
        }>
        <View style={styles.approvalsCard}>
          <Text style={styles.approvalsTitle}>Pending approvals</Text>
          <Text style={styles.approvalsValue}>{approvalsQuery.data?.length || 0}</Text>
          <Text style={styles.approvalsHint}>Review these from Queue tab actions</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{statsQuery.data?.todayBookings || 0}</Text>
            <Text style={styles.metricLabel}>Assigned Today</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{statsQuery.data?.completedToday || 0}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
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
  approvalsCard: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.warning50,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: Spacing.lg,
  },
  approvalsTitle: {fontSize: FontSize.body, color: Colors.warning700, fontWeight: FontWeight.semibold},
  approvalsValue: {marginTop: 4, fontSize: FontSize.display, color: Colors.warning700, fontWeight: FontWeight.bold},
  approvalsHint: {marginTop: 4, fontSize: FontSize.body, color: Colors.warning700},
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
