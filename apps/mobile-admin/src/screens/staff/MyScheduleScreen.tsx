import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {shopApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export default function MyScheduleScreen() {
  const {selectedShopId} = useAuthStore();

  const {data, isLoading} = useQuery({
    queryKey: ['staffMySchedule', selectedShopId],
    queryFn: () => shopApi.getWorkingHours(selectedShopId!).then(res => res.data || {}),
    enabled: !!selectedShopId,
  });

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Select a shop to view schedule</Text>
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
        <Text style={styles.title}>My Schedule</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {DAYS.map(day => {
          const row = data?.[day];
          const isOpen = !!row?.isOpen;
          return (
            <View key={day} style={styles.rowCard}>
              <Text style={styles.day}>{day.toUpperCase()}</Text>
              <Text style={styles.time}>
                {isOpen ? `${row?.openTime || '--:--'} - ${row?.closeTime || '--:--'}` : 'Off'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  emptyText: {fontSize: FontSize.h3, color: Colors.textSecondary},
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  title: {fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
  content: {padding: Spacing.lg},
  rowCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  day: {fontSize: FontSize.label, color: Colors.textMuted, fontWeight: FontWeight.semibold},
  time: {marginTop: 4, fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.medium},
});
