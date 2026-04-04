import React from 'react';
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
import {dashboardApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {ChartColumn, CreditCard, Users} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OwnerDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {selectedShopId, user} = useAuthStore();

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Owner View</Text>
        <Text style={styles.title}>{user?.name || 'Owner'}</Text>
        <Text style={styles.subtitle}>Operational pulse for today</Text>
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
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats?.todayBookings || 0}</Text>
            <Text style={styles.kpiLabel}>Today Bookings</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>Rs {stats?.todayRevenue || 0}</Text>
            <Text style={styles.kpiLabel}>Today Revenue</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats?.pendingBookings || 0}</Text>
            <Text style={styles.kpiLabel}>Pending Queue</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats?.completedToday || 0}</Text>
            <Text style={styles.kpiLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('StaffManagement', {shopId: selectedShopId})}>
            <Users size={18} color={Colors.primary600} />
            <Text style={styles.shortcutText}>Staff</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Analytics', {shopId: selectedShopId})}>
            <ChartColumn size={18} color={Colors.primary600} />
            <Text style={styles.shortcutText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('PayoutDetails', {shopId: selectedShopId})}>
            <CreditCard size={18} color={Colors.primary600} />
            <Text style={styles.shortcutText}>Payouts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF',
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
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.label,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.h1,
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.body,
  },
  content: {
    padding: Spacing.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  kpiCard: {
    width: '47%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderColor: Colors.gray100,
    borderWidth: 1,
    padding: Spacing.lg,
    shadowColor: '#3346d3',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  kpiValue: {
    color: '#1A245F',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.h2,
  },
  kpiLabel: {
    marginTop: 4,
    color: '#596189',
    fontSize: FontSize.body,
  },
  shortcutsRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shortcutCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderColor: '#D7DEFF',
    borderWidth: 1,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  shortcutText: {
    color: Colors.primary700,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.body,
  },
});
