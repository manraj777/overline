import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRoute, RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../types';
import {shopApi} from '../../api/client';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';

type RouteProps = RouteProp<RootStackParamList, 'PayoutDetails'>;

type PayoutForm = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
};

const EMPTY_FORM: PayoutForm = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
};

export default function PayoutDetailsScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const {shopId} = route.params;
  const [form, setForm] = useState<PayoutForm>(EMPTY_FORM);

  const {data, isLoading} = useQuery({
    queryKey: ['payoutDetails', shopId],
    queryFn: () => shopApi.getPayoutDetails(shopId).then(res => res.data),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (data?.payoutDetails) {
      setForm({
        accountHolderName: data.payoutDetails.accountHolderName || '',
        bankName: data.payoutDetails.bankName || '',
        accountNumber: data.payoutDetails.accountNumber || '',
        ifscCode: data.payoutDetails.ifscCode || '',
        upiId: data.payoutDetails.upiId || '',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: PayoutForm) => shopApi.updatePayoutDetails(shopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['payoutDetails', shopId]});
      queryClient.invalidateQueries({queryKey: ['shopSettings', shopId]});
      Alert.alert('Saved', 'Payout details updated successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Failed', error?.response?.data?.message || 'Could not save payout details.');
    },
  });

  const onSave = () => {
    if (!form.upiId.trim() && (!form.accountNumber.trim() || !form.ifscCode.trim())) {
      Alert.alert(
        'Incomplete details',
        'Add either a valid UPI ID or both bank account number and IFSC code.',
      );
      return;
    }

    updateMutation.mutate({
      accountHolderName: form.accountHolderName.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifscCode: form.ifscCode.trim().toUpperCase(),
      upiId: form.upiId.trim(),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Owner payout details</Text>
      <Text style={styles.headerSubtitle}>
        Set where shop earnings should be transferred. You can keep both bank and UPI.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bank Transfer</Text>

        <TextInput
          style={styles.input}
          placeholder="Account holder name"
          value={form.accountHolderName}
          onChangeText={value => setForm(current => ({...current, accountHolderName: value}))}
          placeholderTextColor={Colors.gray400}
        />
        <TextInput
          style={styles.input}
          placeholder="Bank name"
          value={form.bankName}
          onChangeText={value => setForm(current => ({...current, bankName: value}))}
          placeholderTextColor={Colors.gray400}
        />
        <TextInput
          style={styles.input}
          placeholder="Account number"
          value={form.accountNumber}
          onChangeText={value => setForm(current => ({...current, accountNumber: value}))}
          keyboardType="number-pad"
          placeholderTextColor={Colors.gray400}
        />
        <TextInput
          style={styles.input}
          placeholder="IFSC code"
          value={form.ifscCode}
          onChangeText={value => setForm(current => ({...current, ifscCode: value}))}
          autoCapitalize="characters"
          placeholderTextColor={Colors.gray400}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>UPI</Text>
        <TextInput
          style={styles.input}
          placeholder="example@bank"
          value={form.upiId}
          onChangeText={value => setForm(current => ({...current, upiId: value}))}
          autoCapitalize="none"
          placeholderTextColor={Colors.gray400}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={updateMutation.isPending}>
        {updateMutation.isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>Save Payout Details</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  headerTitle: {
    color: Colors.gray900,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: Colors.gray500,
    fontSize: FontSize.body,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.gray800,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.body,
    color: Colors.gray900,
    backgroundColor: Colors.white,
  },
  saveButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
});
