import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {format} from 'date-fns';
import {bookingsApi, shopApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Booking} from '../../types';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const QUEUE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

export default function QueueScreen() {
  const {selectedShopId} = useAuthStore();
  const queryClient = useQueryClient();
  const [showBatteryBanner, setShowBatteryBanner] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('dismissedBatteryBanner').then(val => {
      if (val !== 'true') {
        setShowBatteryBanner(true);
      }
    });
  }, []);

  const dismissBatteryBanner = () => {
    setShowBatteryBanner(false);
    AsyncStorage.setItem('dismissedBatteryBanner', 'true');
  };

  const {
    data: queueBookings = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ['adminQueue', selectedShopId],
    queryFn: async () => {
      const results = await Promise.all(
        QUEUE_STATUSES.map(status =>
          bookingsApi
            .getAll(selectedShopId!, {status})
            .then(res => res.data?.bookings || res.data || []),
        ),
      );
      return results.flat();
    },
    enabled: !!selectedShopId,
  });

  const { data: shopSettings } = useQuery({
    queryKey: ['shopSettings', selectedShopId],
    queryFn: () => shopApi.getSettings(selectedShopId!).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const toggleOpenMutation = useMutation({
    mutationFn: (isOpen: boolean) =>
      shopApi.updateSettings(selectedShopId!, { settings: { isOpen } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopSettings', selectedShopId] });
      Alert.alert('Success', 'Shop status updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update shop status.');
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({bookingId, status}: {bookingId: string; status: string}) =>
      bookingsApi.updateStatus(bookingId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['adminQueue', selectedShopId]});
      await queryClient.invalidateQueries({queryKey: ['adminBookings']});
    },
  });

  const onCallNext = (bookingId: string) => {
    updateStatus.mutate({bookingId, status: 'IN_PROGRESS'});
  };

  const onMarkDone = (bookingId: string) => {
    updateStatus.mutate({bookingId, status: 'COMPLETED'});
  };

  const onNoShow = (bookingId: string) => {
    Alert.alert(
      'Mark as No-Show?',
      'This will cancel the booking, penalize the user\'s trust score, and remove them from the queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm No-Show', style: 'destructive', onPress: () => updateStatus.mutate({bookingId, status: 'NO_SHOW'}) }
      ]
    );
  };

  const renderItem = ({item, index}: {item: Booking; index: number}) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.token}>#{item.bookingNumber}</Text>
          <Text style={styles.status}>{item.status.replace('_', ' ')}</Text>
        </View>

        <Text style={styles.name}>{item.user?.name || 'Guest'}</Text>
        <Text style={styles.meta}>
          {item.services?.map(service => service.serviceName).join(', ') || 'Service'}
        </Text>
        <Text style={styles.meta}>
          {format(new Date(item.startTime), 'h:mm a')} · {index + 1} in queue
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            disabled={item.status === 'IN_PROGRESS' || updateStatus.isPending}
            onPress={() => onCallNext(item.id)}>
            <Text style={styles.btnSecondaryText}>Call Next</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            disabled={item.status === 'COMPLETED' || updateStatus.isPending}
            onPress={() => onMarkDone(item.id)}>
            <Text style={styles.btnPrimaryText}>Mark Done</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.btn, styles.btnDestructive, { marginTop: Spacing.sm }]}
          disabled={updateStatus.isPending}
          onPress={() => onNoShow(item.id)}>
          <Text style={styles.btnDestructiveText}>Mark No-Show</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to manage queue</Text>
      </View>
    );
  }

  const isOpen = shopSettings?.settings?.isOpen ?? true;

  return (
    <View style={styles.container}>
      {showBatteryBanner && (
        <View style={styles.batteryBanner}>
          <Text style={styles.batteryBannerText}>
            To ensure you receive booking alerts, please disable Battery Optimization for this app in your phone settings.
          </Text>
          <TouchableOpacity onPress={dismissBatteryBanner} style={styles.batteryBannerClose}>
            <Text style={styles.batteryBannerCloseText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.header, showBatteryBanner && { paddingTop: Spacing.md }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>Live Queue</Text>
            <Text style={styles.headerSubtitle}>{queueBookings.length} active customers</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: isOpen ? '#10B981' : '#64748B' }}>
              {isOpen ? 'SHOP OPEN' : 'SHOP CLOSED'}
            </Text>
            <Switch
              value={isOpen}
              onValueChange={(val) => toggleOpenMutation.mutate(val)}
              trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
              thumbColor={isOpen ? '#4F46E5' : '#64748B'}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={queueBookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centeredList}>
            <Text style={styles.emptyTitle}>Queue is clear</Text>
            <Text style={styles.emptySubtitle}>No pending or in-service bookings right now.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
          />
        }
      />
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
  centeredList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  token: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  status: {
    fontSize: FontSize.label,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  meta: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
  },
  btnSecondary: {
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary200,
  },
  btnPrimaryText: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.body,
  },
  btnSecondaryText: {
    color: Colors.primary600,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.body,
  },
  btnDestructive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  btnDestructiveText: {
    color: '#DC2626',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.body,
  },
  batteryBanner: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.md,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batteryBannerText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    marginRight: Spacing.sm,
  },
  batteryBannerClose: {
    padding: Spacing.xs,
  },
  batteryBannerCloseText: {
    color: '#92400E',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
});
