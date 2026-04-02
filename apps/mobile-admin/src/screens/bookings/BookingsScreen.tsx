import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {format} from 'date-fns';
import {bookingsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {RootStackParamList, Booking, BookingStatus} from '../../types';
import {CalendarDays, CircleCheck, Clock3, ClipboardList, Scissors} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const statusFilters: {label: string; value: BookingStatus | 'ALL'}[] = [
  {label: 'All', value: 'ALL'},
  {label: 'Pending', value: 'PENDING'},
  {label: 'Confirmed', value: 'CONFIRMED'},
  {label: 'In Progress', value: 'IN_PROGRESS'},
  {label: 'Completed', value: 'COMPLETED'},
];

export default function BookingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {selectedShopId} = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');

  const {data: bookings = [], isLoading, refetch, isRefetching} = useQuery<
    Booking[]
  >({
    queryKey: ['adminBookings', selectedShopId, statusFilter],
    queryFn: () =>
      bookingsApi
        .getAll(selectedShopId!, {
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
        .then(res => res.data?.bookings || res.data || []),
    enabled: !!selectedShopId,
  });

  const statusColors: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#10B981',
    IN_PROGRESS: '#3B82F6',
    COMPLETED: '#10B981',
    CANCELLED: '#EF4444',
    NO_SHOW: '#6B7280',
  };

  const renderBooking = ({item}: {item: Booking}) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('BookingDetail', {bookingId: item.id})}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.customerName}>{item.user?.name || 'Guest'}</Text>
          <Text style={styles.bookingNumber}>{item.bookingNumber}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: (statusColors[item.status] || '#6B7280') + '20'},
          ]}>
          <Text
            style={[
              styles.statusText,
              {color: statusColors[item.status] || '#6B7280'},
            ]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <CalendarDays size={16} color="#6B7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {format(new Date(item.startTime), 'EEE, MMM d, yyyy')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Clock3 size={16} color="#6B7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {format(new Date(item.startTime), 'h:mm a')} -{' '}
            {format(new Date(item.endTime), 'h:mm a')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Scissors size={16} color="#6B7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {item.services?.map(s => s.serviceName).join(', ')}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Code:</Text>
          <Text style={styles.codeValue}>{item.verificationCode}</Text>
        </View>
        <Text style={styles.amount}>₹{item.displayAmount}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ClipboardList size={34} color="#9CA3AF" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Bookings Found</Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter === 'ALL'
          ? 'No bookings to display'
          : `No ${statusFilter.toLowerCase().replace('_', ' ')} bookings`}
      </Text>
    </View>
  );

  if (isLoading) {
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
        <Text style={styles.headerTitle}>Bookings</Text>
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => navigation.navigate('VerifyCode')}>
          <CircleCheck size={14} color="#fff" />
          <Text style={styles.verifyButtonText}>Verify</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={item => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(item.value)}>
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === item.value && styles.filterChipTextActive,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#4F46E5']}
          />
        }
      />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  verifyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterList: {
    padding: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  bookingNumber: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
    width: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  codeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
    letterSpacing: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});
