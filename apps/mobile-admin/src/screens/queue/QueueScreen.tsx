import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {format} from 'date-fns';
import {bookingsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Booking} from '../../types';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const QUEUE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

export default function QueueScreen() {
  const {selectedShopId} = useAuthStore();
  const queryClient = useQueryClient();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Queue</Text>
        <Text style={styles.headerSubtitle}>{queueBookings.length} active customers</Text>
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
