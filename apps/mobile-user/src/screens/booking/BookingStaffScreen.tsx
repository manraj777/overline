import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queueApi, shopsApi } from '../../api/client';
import { RootStackParamList, TimeSlot } from '../../types';
import { Colors, FontWeights, Shadows } from '../../theme';
import { 
  ChevronLeft, 
  Star, 
  CheckCircle2, 
  UserRound, 
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const ANY_STAFF_ID = 'ANY';

type RouteProps = RouteProp<RootStackParamList, 'BookingStaff'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

    const options = [
      {
        id: ANY_STAFF_ID,
        name: 'Any Specialist',
        role: 'Fastest availability',
        rating: 4.9,
        isExpert: false,
        isAny: true,
      },
    ];

    uniqueStaffIds.forEach((staffId, index) => {
      options.push({
        id: staffId,
        name: `Specialist ${index + 1}`,
        role: 'Senior Stylist',
        rating: 4.8,
        isExpert: index === 0,
        isAny: false,
      });
    });

    return options;
  }, [availability?.slots]);

  const isLoading = loadingShop || loadingAvailability;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Select Professional</Text>
            <Text style={styles.headerSubtitle}>{selectedServices.length} services selected</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map(step => (
            <View key={step} style={styles.progressStepContainer}>
              <View style={[styles.progressStep, step <= 2 && styles.progressStepActive]}>
                <Text style={[styles.progressText, step <= 2 && styles.progressTextActive]}>{step}</Text>
              </View>
              {step < 4 && <View style={[styles.progressLine, step < 2 && styles.progressLineActive]} />}
            </View>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoSection}>
            <Text style={styles.mainTitle}>Who would you like to book with?</Text>
            <Text style={styles.mainDesc}>Choose a professional or select 'Any Specialist' for the earliest possible time slot.</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Finding available staff...</Text>
            </View>
          ) : (
            <View style={styles.staffGrid}>
              {staffOptions.map(staff => {
                const isSelected = selectedStaffId === staff.id;
                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={[styles.staffCard, isSelected && styles.staffCardSelected]}
                    onPress={() => setSelectedStaffId(staff.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.avatarWrapper, isSelected && styles.avatarWrapperSelected]}>
                        {staff.isAny ? (
                          <Sparkles size={24} color={isSelected ? '#FFF' : '#3B82F6'} />
                        ) : (
                          <UserRound size={24} color={isSelected ? '#FFF' : '#64748B'} />
                        )}
                      </View>
                      <View style={styles.ratingBadge}>
                        <Star size={12} color="#F59E0B" fill="#F59E0B" />
                        <Text style={styles.ratingText}>{staff.rating}</Text>
                      </View>
                    </View>

                    <View style={styles.staffMeta}>
                      <Text style={[styles.staffName, isSelected && styles.staffNameSelected]}>{staff.name}</Text>
                      <Text style={styles.staffRole}>{staff.role}</Text>
                    </View>

                    {staff.isExpert && (
                      <View style={styles.expertBadge}>
                        <Zap size={10} color="#3B82F6" fill="#3B82F6" />
                        <Text style={styles.expertText}>BEST RATED</Text>
                      </View>
                    )}

                    {isSelected && (
                      <View style={styles.selectedMarker}>
                        <CheckCircle2 size={20} color="#3B82F6" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.safetyCard}>
            <ShieldCheck size={20} color="#10B981" />
            <Text style={styles.safetyText}>All our professionals follow strict hygiene protocols</Text>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() =>
              navigation.navigate('Booking', {
                shopId,
                selectedServices,
                selectedStaffId: selectedStaffId === ANY_STAFF_ID ? undefined : selectedStaffId,
              })
            }
          >
            <View>
              <Text style={styles.continueTitle}>Continue</Text>
              <Text style={styles.continueSubtitle}>Choose your time slot</Text>
            </View>
            <ArrowRight size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  progressStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  progressTextActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#3B82F6',
  },
  scrollContent: {
    padding: 24,
  },
  infoSection: {
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 32,
  },
  mainDesc: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 12,
    lineHeight: 22,
  },
  loadingWrapper: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 14,
  },
  staffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  staffCard: {
    width: (width - 48 - 16) / 2,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  staffCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapperSelected: {
    backgroundColor: '#3B82F6',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  staffMeta: {
    marginBottom: 8,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  staffNameSelected: {
    color: '#0F172A',
  },
  staffRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  expertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  expertText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B82F6',
  },
  selectedMarker: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    marginTop: 32,
    gap: 12,
  },
  safetyText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  continueTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  continueSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
});
