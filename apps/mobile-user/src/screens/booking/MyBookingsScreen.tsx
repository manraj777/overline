import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, Animated,
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
import { useAuthStore } from '../../stores/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'upcoming' | 'pending' | 'confirmed' | 'past' | 'cancelled' | 'all';

export default function MyBookingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const { data: bookingsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['myBookings', activeTab],
    queryFn: () => bookingsApi.getMy(activeTab === 'all' ? undefined : { status: activeTab }).then(res => res.data),
    enabled: isAuthenticated,
  });

  const bookings: Booking[] = Array.isArray(bookingsData) ? bookingsData : bookingsData?.data || [];

  const displayBookings = bookings;

  const AnimatedBookingCard = React.useCallback(({ item, index }: { item: Booking; index: number }) => {
    const config = BookingStatusConfig[item.status] || { color: Colors.textTertiary, bg: Colors.surfaceLight, icon: '•' };
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
      ]).start();
    }, []);

    const onPressIn = () => {
      Animated.spring(scaleAnim, { toValue: 0.97, friction: 8, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.bookingCard}
          onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}>
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
      </Animated.View>
    );
  }, [activeTab, navigation]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.unauthContainer}>
          <Calendar color={Colors.primary} size={64} style={{ marginBottom: 20 }} />
          <Text style={styles.unauthTitle}>Your Bookings await</Text>
          <Text style={styles.unauthSubtitle}>
            Log in to view upcoming appointments, view receipts, and reschedule slots.
          </Text>
          <TouchableOpacity
            style={styles.unauthBtn}
            onPress={() => navigation.navigate('Login' as any)}
          >
            <Text style={styles.unauthBtnText}>SIGN IN / SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user?.isPhoneVerified) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.loadingContainer, { paddingHorizontal: Spacing.xl }]}> 
          <Text style={styles.headerTitle}>Verify mobile number first</Text>
          <Text style={[styles.detailText, { textAlign: 'center', marginTop: Spacing.sm }]}> 
            Verify your phone from profile to view latest and past bookings.
          </Text>
          <TouchableOpacity
            style={[styles.activeTab, { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl }]}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Text style={styles.activeTabText}>Open Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 32 }}>
          {(['upcoming', 'pending', 'confirmed', 'past', 'cancelled', 'all'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={displayBookings}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => <AnimatedBookingCard item={item} index={index} />}
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
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, alignItems: 'center',
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
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl * 1.5,
    backgroundColor: Colors.background,
  },
  unauthTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    fontWeight: '600',
  },
  unauthBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.xl,
    width: '100%',
    alignItems: 'center',
  },
  unauthBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
