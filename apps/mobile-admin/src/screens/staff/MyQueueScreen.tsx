import React, {useCallback, useEffect} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {bookingsApi, queueApi, staffApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {useQueueRealtime} from '../../hooks/useQueueRealtime';
import {Booking, RootStackParamList} from '../../types';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const QUEUE_STATUSES = ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS'];
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyQueueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {selectedShopId} = useAuthStore();
  const queryClient = useQueryClient();

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({queryKey: ['staffMyQueue', selectedShopId]});
  }, [queryClient, selectedShopId]);

  const {connected, lastUpdatedAt} = useQueueRealtime({
    shopId: selectedShopId,
    onQueueUpdate: handleRealtimeUpdate,
  });

  const {
    data: queueBookings = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ['staffMyQueue', selectedShopId],
    queryFn: async () => {
      const results = await Promise.all(
        QUEUE_STATUSES.map(status =>
          bookingsApi.getAll(selectedShopId!, {status}).then(res => res.data?.bookings || res.data || []),
        ),
      );
      return results.flat();
    },
    enabled: !!selectedShopId,
    refetchInterval: connected ? false : 10000,
  });

  const { data: staffProfile } = useQuery({
    queryKey: ['staffProfile'],
    queryFn: () => staffApi.getMe().then(res => res.data),
    enabled: !!selectedShopId,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      staffApi.updateMe({ isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffProfile'] });
      Alert.alert('Success', 'Availability status updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status.');
    }
  });

  useEffect(() => {
    if (lastUpdatedAt) {
      refetch();
    }
  }, [lastUpdatedAt, refetch]);

  const refreshQueue = async () => {
    await queryClient.invalidateQueries({queryKey: ['staffMyQueue', selectedShopId]});
    await queryClient.invalidateQueries({queryKey: ['adminBookings']});
  };

  const callAheadMutation = useMutation({
    mutationFn: (bookingId: string) => queueApi.callAhead(selectedShopId!, bookingId),
    onSuccess: refreshQueue,
  });

  const skipMutation = useMutation({
    mutationFn: (bookingId: string) => queueApi.skip(selectedShopId!, bookingId),
    onSuccess: refreshQueue,
  });

  const overrunMutation = useMutation({
    mutationFn: (bookingId: string) => queueApi.overrun(selectedShopId!, bookingId, 10),
    onSuccess: refreshQueue,
  });

  const callNextMutation = useMutation({
    mutationFn: (count: number) => queueApi.callNext(selectedShopId!, count),
    onSuccess: () => {
      refreshQueue();
      Alert.alert('Success', 'Successfully called next customers.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to call next customers.');
    }
  });

  const loadingAction = 
    callAheadMutation.isPending || 
    skipMutation.isPending || 
    overrunMutation.isPending ||
    callNextMutation.isPending;

  const renderItem = ({item, index}: {item: Booking; index: number}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.token}>#{item.bookingNumber}</Text>
        <Text style={styles.status}>{item.status.replace('_', ' ')}</Text>
      </View>

      <Text style={styles.name}>{item.user?.name || 'Guest'}</Text>
      <Text style={styles.meta}>ETA {format(new Date(item.startTime), 'h:mm a')}</Text>
      <Text style={styles.meta}>Queue position {index + 1}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.callAheadBtn]}
          disabled={loadingAction}
          onPress={() => callAheadMutation.mutate(item.id)}>
          <Text style={styles.callAheadText}>Call Ahead</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.skipBtn]}
          disabled={loadingAction}
          onPress={() => skipMutation.mutate(item.id)}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.overrunBtn]}
          disabled={loadingAction}
          onPress={() => overrunMutation.mutate(item.id)}>
          <Text style={styles.overrunText}>+10m</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.secondaryActions}>
        <TouchableOpacity
          style={styles.linkAction}
          onPress={() => navigation.navigate('PreArrivalChat', {bookingId: item.id, customerName: item.user?.name})}>
          <Text style={styles.linkActionText}>Open Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to manage your queue</Text>
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

  const isStaffActive = staffProfile?.isActive ?? true;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>My Queue</Text>
            <Text style={styles.headerSubtitle}>
              {queueBookings.length} active customers • {connected ? 'Live' : 'Polling 10s'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: isStaffActive ? '#10B981' : '#64748B' }}>
              {isStaffActive ? 'PRESENT' : 'ABSENT'}
            </Text>
            <Switch
              value={isStaffActive}
              onValueChange={(val) => toggleStatusMutation.mutate(val)}
              trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
              thumbColor={isStaffActive ? '#4F46E5' : '#64748B'}
            />
          </View>
        </View>
      </View>

      <View style={styles.topActionsRow}>
        <TouchableOpacity style={styles.topAction} onPress={() => navigation.navigate('PendingApprovals')}>
          <Text style={styles.topActionText}>Pending Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topAction} onPress={() => navigation.navigate('LocationMap')}>
          <Text style={styles.topActionText}>Location Map</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.topAction, { backgroundColor: Colors.primary, borderColor: Colors.primary }]} 
          onPress={() => {
            Alert.alert(
              'Call Customers',
              'Notify and call the next 3 waiting customers?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call 3', onPress: () => callNextMutation.mutate(3) }
              ]
            );
          }}
          disabled={loadingAction || callNextMutation.isPending}
        >
          <Text style={[styles.topActionText, { color: Colors.white }]}>Call Next 3</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queueBookings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centeredList}>
            <Text style={styles.emptyTitle}>Queue is clear</Text>
            <Text style={styles.emptySubtitle}>No pending customers right now.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  centeredList: {alignItems: 'center', justifyContent: 'center', paddingTop: 80},
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: Colors.textPrimary},
  headerSubtitle: {marginTop: 2, fontSize: FontSize.body, color: Colors.textSecondary},
  topActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary200,
    backgroundColor: Colors.primary50,
    paddingVertical: Spacing.sm,
  },
  topActionText: {
    fontSize: FontSize.body,
    color: Colors.primary700,
    fontWeight: FontWeight.semibold,
  },
  listContent: {padding: Spacing.lg},
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  token: {fontSize: FontSize.h3, fontWeight: FontWeight.semibold, color: Colors.primary},
  status: {fontSize: FontSize.label, fontWeight: FontWeight.medium, color: Colors.textSecondary, textTransform: 'uppercase'},
  name: {fontSize: FontSize.h3, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 4},
  meta: {fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: 2},
  actionsRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md},
  actionButton: {flex: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm},
  callAheadBtn: {backgroundColor: Colors.primary50, borderWidth: 1, borderColor: Colors.primary200},
  skipBtn: {backgroundColor: Colors.warning50, borderWidth: 1, borderColor: '#FCD34D'},
  overrunBtn: {backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200},
  callAheadText: {fontSize: FontSize.body, color: Colors.primary700, fontWeight: FontWeight.semibold},
  skipText: {fontSize: FontSize.body, color: Colors.warning700, fontWeight: FontWeight.semibold},
  overrunText: {fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  secondaryActions: {marginTop: Spacing.sm},
  linkAction: {alignSelf: 'flex-start'},
  linkActionText: {fontSize: FontSize.body, color: Colors.primary700, fontWeight: FontWeight.medium},
  emptyTitle: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  emptySubtitle: {marginTop: 6, fontSize: FontSize.body, color: Colors.textSecondary},
});
