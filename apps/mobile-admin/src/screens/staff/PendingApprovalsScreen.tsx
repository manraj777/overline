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
import {bookingsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {Booking} from '../../types';

export default function PendingApprovalsScreen() {
  const {selectedShopId} = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: approvals = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ['staffPendingApprovalsScreen', selectedShopId],
    queryFn: () =>
      bookingsApi
        .getAll(selectedShopId!, {status: 'PENDING_APPROVAL'})
        .then(res => res.data?.bookings || res.data || []),
    enabled: !!selectedShopId,
  });

  const updateStatus = useMutation({
    mutationFn: ({bookingId, status}: {bookingId: string; status: string}) =>
      bookingsApi.updateStatus(bookingId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['staffPendingApprovalsScreen', selectedShopId]});
      await queryClient.invalidateQueries({queryKey: ['staffMyQueue', selectedShopId]});
    },
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to review approvals</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
      </View>

      <FlatList
        data={approvals}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
        }
        ListEmptyComponent={<Text style={styles.emptySubtitle}>No approvals pending</Text>}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.user?.name || 'Guest'}</Text>
            <Text style={styles.meta}>{item.services?.[0]?.serviceName || 'Service'} • #{item.bookingNumber}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.approve]}
                onPress={() => updateStatus.mutate({bookingId: item.id, status: 'CONFIRMED'})}>
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.reject]}
                onPress={() => updateStatus.mutate({bookingId: item.id, status: 'CANCELLED'})}>
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
  listContent: {padding: Spacing.lg},
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  name: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  meta: {marginTop: 4, fontSize: FontSize.body, color: Colors.textSecondary},
  actions: {marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.sm},
  button: {flex: 1, borderRadius: Radius.md, alignItems: 'center', paddingVertical: Spacing.sm},
  approve: {backgroundColor: Colors.primary50, borderWidth: 1, borderColor: Colors.primary200},
  reject: {backgroundColor: Colors.danger50, borderWidth: 1, borderColor: '#FCA5A5'},
  approveText: {fontSize: FontSize.body, color: Colors.primary700, fontWeight: FontWeight.semibold},
  rejectText: {fontSize: FontSize.body, color: Colors.danger700, fontWeight: FontWeight.semibold},
  emptyTitle: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  emptySubtitle: {fontSize: FontSize.body, color: Colors.textSecondary},
});
