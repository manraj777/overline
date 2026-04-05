import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/client';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../../theme';
import { Bell, CheckCheck } from 'lucide-react-native';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.get({ page: 1, limit: 50 }).then((res) => res.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items: NotificationItem[] = Array.isArray(data?.data) ? data.data : [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.markAllButton} onPress={() => markAll.mutate()}>
          <CheckCheck size={16} color={Colors.primary} />
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={38} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>Booking reminders and updates will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.card, !item.readAt && styles.unreadCard]}
              onPress={() => {
                if (!item.readAt) {
                  markRead.mutate(item.id);
                }
              }}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold, color: Colors.textPrimary },
  markAllButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markAllText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { marginTop: Spacing.md, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
  emptySubtitle: { marginTop: 6, textAlign: 'center', color: Colors.textSecondary },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  unreadCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  cardTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.textPrimary },
  cardBody: { marginTop: 4, fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  cardTime: { marginTop: Spacing.sm, fontSize: FontSizes.xs, color: Colors.textTertiary },
});
