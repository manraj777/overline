import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const STORAGE_KEY = 'staff_notification_settings';

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState({
    reminders: true,
    callAhead: true,
    newBookings: true,
    reviews: true,
    queueAlerts: true,
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

  const toggle = (key: keyof typeof settings, value: boolean) => {
    const next = {...settings, [key]: value};
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const rows: Array<{key: keyof typeof settings; label: string}> = [
    {key: 'reminders', label: 'Client reminders'},
    {key: 'callAhead', label: 'Call-ahead alerts'},
    {key: 'newBookings', label: 'New booking requests'},
    {key: 'reviews', label: 'New reviews'},
    {key: 'queueAlerts', label: 'Queue status alerts'},
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {rows.map(row => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Switch
              value={settings[row.key]}
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
