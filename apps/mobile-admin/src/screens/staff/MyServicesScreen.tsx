import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {servicesApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {Service} from '../../types';

export default function MyServicesScreen() {
  const {selectedShopId} = useAuthStore();

  const {
    data: services = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Service[]>({
    queryKey: ['staffMyServices', selectedShopId],
    queryFn: () => servicesApi.getAll(selectedShopId!).then(res => res.data || []),
    enabled: !!selectedShopId,
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to view services</Text>
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
        <Text style={styles.headerTitle}>My Services</Text>
      </View>

      <FlatList
        data={services}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptySubtitle}>No services found</Text>}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Rs {item.price} • {item.durationMinutes} min</Text>
            <Text style={styles.status}>{item.isActive ? 'Active' : 'Inactive'}</Text>
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
  headerTitle: {fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: Colors.textPrimary},
  listContent: {padding: Spacing.lg},
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  name: {fontSize: FontSize.h3, fontWeight: FontWeight.semibold, color: Colors.textPrimary},
  meta: {marginTop: 4, fontSize: FontSize.body, color: Colors.textSecondary},
  status: {marginTop: 6, fontSize: FontSize.label, color: Colors.primary700, fontWeight: FontWeight.medium},
  emptyTitle: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  emptySubtitle: {fontSize: FontSize.body, color: Colors.textSecondary},
});
