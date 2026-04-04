import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queueApi, shopsApi } from '../../api/client';
import { RootStackParamList, TimeSlot } from '../../types';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { Check, UserRound } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'BookingStaff'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type StaffOption = {
  id: string;
  label: string;
  subtitle: string;
};

const ANY_STAFF_ID = 'ANY';

export default function BookingStaffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId, selectedServices } = route.params;
  const [selectedStaffId, setSelectedStaffId] = useState<string>(ANY_STAFF_ID);

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
  });

  const { data: availability, isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability-staff-step', shopId, selectedServices.join('|')],
    queryFn: () =>
      queueApi
        .getSlots(shopId, {
          date: format(new Date(), 'yyyy-MM-dd'),
          serviceIds: selectedServices,
        })
        .then(res => res.data),
  });

  const staffOptions = useMemo(() => {
    const slots: TimeSlot[] = availability?.slots || [];
    const uniqueStaffIds = Array.from(new Set(slots.map(slot => slot.staffId).filter(Boolean) as string[]));

    const options: StaffOption[] = [
      {
        id: ANY_STAFF_ID,
        label: 'Any Professional',
        subtitle: 'Fastest availability based on your selected services',
      },
    ];

    uniqueStaffIds.forEach((staffId, index) => {
      options.push({
        id: staffId,
        label: `Professional ${index + 1}`,
        subtitle: `Assigned specialist • ${staffId.slice(-4).toUpperCase()}`,
      });
    });

    return options;
  }, [availability?.slots]);

  const isLoading = loadingShop || loadingAvailability;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Book Appointment</Text>
          <Text style={styles.stepSubtitle}>Step 2 of 4 • Select professional</Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.step, styles.stepActive]}><Text style={styles.stepText}>1</Text></View>
            <View style={styles.stepLineActive} />
            <View style={[styles.step, styles.stepActive]}><Text style={styles.stepText}>2</Text></View>
            <View style={styles.stepLine} />
            <View style={styles.step}><Text style={styles.stepTextMuted}>3</Text></View>
            <View style={styles.stepLine} />
            <View style={styles.step}><Text style={styles.stepTextMuted}>4</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{shop?.name || 'Select Your Professional'}</Text>
          <Text style={styles.sectionSubtitle}>Choose who you prefer for this appointment.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.staffList}>
            {staffOptions.map(staff => {
              const isSelected = selectedStaffId === staff.id;
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[styles.staffCard, isSelected && styles.staffCardSelected]}
                  onPress={() => setSelectedStaffId(staff.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                    <UserRound color={isSelected ? '#fff' : Colors.primary} size={18} />
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.label}</Text>
                    <Text style={styles.staffSubtitle}>{staff.subtitle}</Text>
                  </View>
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                    {isSelected && <Check color="#fff" size={14} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Continue to Slot Selection"
          onPress={() =>
            navigation.navigate('Booking', {
              shopId,
              selectedServices,
              selectedStaffId: selectedStaffId === ANY_STAFF_ID ? undefined : selectedStaffId,
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepHeader: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.glow,
  },
  stepText: {
    color: '#fff',
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
  stepTextMuted: {
    color: Colors.textTertiary,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: Spacing.sm,
  },
  stepLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  staffList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  staffCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarSelected: {
    backgroundColor: Colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  staffSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.md,
  },
});
