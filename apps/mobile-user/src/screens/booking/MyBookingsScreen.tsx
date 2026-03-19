import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, isPast } from 'date-fns';
import { Calendar, Clock } from 'lucide-react-native';
import { bookingsApi } from '../../api/client';
import { RootStackParamList, Booking } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, BookingStatusConfig, Shadows } from '../../theme';
import { Badge, EmptyState } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'upcoming' | 'past';

export default function MyBookingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const { data: bookingsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingsApi.getMy().then(res => res.data),
  });

  const bookings: Booking[] = Array.isArray(bookingsData) ? bookingsData : bookingsData?.data || [];

  const upcomingBookings = bookings.filter(
    (b: Booking) => !isPast(new Date(b.startTime)) && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
  );
  const pastBookings = bookings.filter(
    (b: Booking) => isPast(new Date(b.startTime)) || ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
  );
  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const renderBooking = ({ item }: { item: Booking }) => {
    const config = BookingStatusConfig[item.status] || { color: Colors.textTertiary, bg: Colors.surfaceLight, icon: '•' };
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
        activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopName}>{item.shop?.name}</Text>
            <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
          </View>
          <Badge text={item.status.replace('_', ' ')} color={config.color} bgColor={config.bg} size="sm" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Calendar color={Colors.textSecondary} size={16} style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>{format(new Date(item.startTime), 'EEE, MMM d, yyyy')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock color={Colors.textSecondary} size={16} style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>{format(new Date(item.startTime), 'h:mm a')}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.servicesText}>{item.services?.length || 0} service(s)</Text>
          <Text style={styles.totalText}>₹{item.displayAmount}</Text>
        </View>

        {activeTab === 'upcoming' && (
          <View style={styles.codeStrip}>
            <Text style={styles.codeLabel}>Code:</Text>
            <Text style={styles.codeValue}>{item.verificationCode}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['upcoming', 'past'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'upcoming' ? `Upcoming (${upcomingBookings.length})` : `Past (${pastBookings.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayBookings}
        keyExtractor={item => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === 'upcoming' ? '📋' : '📜'}
            title={activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
            subtitle={activeTab === 'upcoming' ? 'Book a service to get started' : 'Your completed bookings will appear here'}
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold, color: Colors.textPrimary },
  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  tab: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primary, borderColor: Colors.primary, ...Shadows.lg,
  },
  tabText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.textSecondary },
  activeTabText: { color: '#fff' },
  listContent: { padding: Spacing.xl, paddingTop: 0, paddingBottom: 100 },
  bookingCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  shopName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.textPrimary, marginBottom: 2 },
  bookingNumber: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  cardBody: { marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: Spacing.sm },
  detailIcon: { fontSize: 14 },
  detailText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  servicesText: { fontSize: FontSizes.sm, color: Colors.textTertiary },
  totalText: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
  codeStrip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryGhost, padding: Spacing.md,
    borderRadius: BorderRadius.md, marginTop: Spacing.md,
  },
  codeLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  codeValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.extrabold, color: Colors.primary, letterSpacing: 4 },
});
