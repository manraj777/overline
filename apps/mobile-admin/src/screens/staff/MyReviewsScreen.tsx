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
import {reviewsApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {ReviewItem, StaffReviewsResponse} from '../../types';

export default function MyReviewsScreen() {
  const {selectedShopId} = useAuthStore();

  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<StaffReviewsResponse>({
    queryKey: ['staffMyReviews', selectedShopId],
    queryFn: () =>
      reviewsApi
        .getMyStaffReviews(selectedShopId!, {limit: 20})
        .then(res => res.data),
    enabled: !!selectedShopId,
  });

  const reviews = response?.data || [];
  const stats = response?.stats;

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to view reviews</Text>
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
        <Text style={styles.headerTitle}>My Reviews</Text>
        <Text style={styles.headerSubtitle}>Customer feedback linked to your completed services</Text>
        {stats ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryLabel}>Average</Text>
              <Text style={styles.summaryValue}>{stats.averageRating.toFixed(1)} / 5</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{stats.totalReviews}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <FlatList
        data={reviews}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptySubtitle}>No reviews yet.</Text>}
        renderItem={({item}: {item: ReviewItem}) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.user?.name || 'Guest'}</Text>
            <Text style={styles.meta}>{item.booking?.services?.[0]?.serviceName || 'Service'}</Text>
            <Text style={styles.rating}>Rating: {item.rating} / 5</Text>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
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
  headerSubtitle: {marginTop: 2, fontSize: FontSize.body, color: Colors.textSecondary},
  summaryRow: {marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm},
  summaryChip: {
    backgroundColor: Colors.primary50,
    borderWidth: 1,
    borderColor: Colors.primary200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {fontSize: FontSize.label, color: Colors.primary700},
  summaryValue: {fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  listContent: {padding: Spacing.lg},
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  name: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  meta: {marginTop: 4, fontSize: FontSize.body, color: Colors.textSecondary},
  rating: {marginTop: 8, fontSize: FontSize.label, color: Colors.primary700, fontWeight: FontWeight.semibold},
  comment: {marginTop: 6, fontSize: FontSize.body, color: Colors.textPrimary},
  emptyTitle: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  emptySubtitle: {fontSize: FontSize.body, color: Colors.textSecondary},
});
