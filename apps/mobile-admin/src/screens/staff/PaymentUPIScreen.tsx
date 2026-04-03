import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

const STORAGE_KEY = 'staff_upi_settings';

export default function PaymentUPIScreen() {
  const [upiId, setUpiId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setUpiId(parsed.upiId || '');
          setBeneficiaryName(parsed.beneficiaryName || '');
        } catch {
          // Ignore malformed local settings.
        }
      }
    });
  }, []);

  const save = async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({upiId: upiId.trim(), beneficiaryName: beneficiaryName.trim()}),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment UPI</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>UPI ID</Text>
        <TextInput
          style={styles.input}
          value={upiId}
          onChangeText={setUpiId}
          placeholder="name@bank"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Beneficiary Name</Text>
        <TextInput
          style={styles.input}
          value={beneficiaryName}
          onChangeText={setBeneficiaryName}
          placeholder="Account holder name"
        />

        <TouchableOpacity style={styles.saveButton} onPress={save}>
          <Text style={styles.saveText}>Save Payout Setup</Text>
        </TouchableOpacity>

        {saved && <Text style={styles.savedText}>Saved successfully</Text>}
      </View>
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
  label: {fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: 6},
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  saveText: {fontSize: FontSize.body, color: Colors.white, fontWeight: FontWeight.semibold},
  savedText: {marginTop: Spacing.sm, color: Colors.success700, fontSize: FontSize.body},
});
