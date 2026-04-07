import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const STORAGE_KEY = 'staff_notification_settings';
type ToggleKey = 'reminders' | 'callAhead' | 'newBookings' | 'reviews' | 'queueAlerts';

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState({
    reminders: true,
    callAhead: true,
    newBookings: true,
    reviews: true,
    queueAlerts: true,
    sendTime: '09:00',
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSettings(prev => ({...prev, ...parsed}));
        } catch {
          // Ignore malformed local settings.
        }
      }
    });
  }, []);

  const toggle = (
    key: 'reminders' | 'callAhead' | 'newBookings' | 'reviews' | 'queueAlerts',
    value: boolean,
  ) => {
    const next = {...settings, [key]: value};
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setSendTime = (sendTime: string) => {
    const next = {...settings, sendTime};
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const rows: Array<{key: ToggleKey; label: string}> = [
    {key: 'reminders', label: 'Client reminders'},
    {key: 'callAhead', label: 'Call-ahead alerts'},
    {key: 'newBookings', label: 'New booking requests'},
    {key: 'reviews', label: 'New reviews'},
    {key: 'queueAlerts', label: 'Queue status alerts'},
  ];

  const sendTimeOptions = ['08:00', '09:00', '10:00', '18:00'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.timeCard}>
          <Text style={styles.timeTitle}>Notification Send Time</Text>
          <Text style={styles.timeSubtitle}>Daily reminder delivery for staff console alerts</Text>
          <View style={styles.timeOptions}>
            {sendTimeOptions.map(option => {
              const active = settings.sendTime === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => setSendTime(option)}
                >
                  <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {rows.map(row => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Switch
              value={Boolean(settings[row.key])}
              onValueChange={value => toggle(row.key, value)}
              trackColor={{false: Colors.gray200, true: Colors.primary200}}
              thumbColor={settings[row.key] ? Colors.primary600 : Colors.gray500}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
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
  timeCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timeTitle: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  timeSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray50,
  },
  timeChipActive: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  timeChipTextActive: {
    color: Colors.primary700,
  },
  row: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.medium},
});
