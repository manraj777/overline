import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { servicesApi } from '../../api/client';
import { RootStackParamList, ServiceFormData } from '../../types';
import { Colors, FontSize, FontWeight, Radius, Spacing, Shadows } from '../../theme';
import { 
  ArrowLeft, 
  Check, 
  Clock, 
  IndianRupee, 
  LayoutGrid, 
  Info, 
  ChevronRight, 
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'ServiceForm'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ServiceForm'>;

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const CATEGORY_PRESETS = ['Hair', 'Beard', 'Facial', 'Massage', 'Grooming', 'Medical'];

export default function ServiceFormScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { shopId, serviceId } = route.params;
  const isEditing = !!serviceId;

  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: 0,
    durationMinutes: 30,
    category: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existingService, isLoading: loadingService } = useQuery({
    queryKey: ['adminService', serviceId],
    queryFn: () => servicesApi.getAll(shopId).then(res => 
      res.data.find((s: any) => s.id === serviceId)
    ),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingService) {
      setFormData({
        name: existingService.name,
        description: existingService.description || '',
        price: Number(existingService.price),
        durationMinutes: existingService.durationMinutes,
        category: existingService.category || '',
        isActive: existingService.isActive,
      });
    }
  }, [existingService]);

  const updateMutation = useMutation({
    mutationFn: (data: ServiceFormData) =>
      isEditing 
        ? servicesApi.update(serviceId!, { ...data, id: serviceId } as any)
        : servicesApi.create(shopId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
      Alert.alert('Success', `Service ${isEditing ? 'updated' : 'created'} successfully`);
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Operation Failed', error.response?.data?.message || 'Check your internet connection.');
    },
  });

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Required';
    if (formData.price <= 0) e.price = 'Invalid';
    if (Object.keys(e).length > 0) return setErrors(e);
    
    updateMutation.mutate(formData);
  };

  if (loadingService) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.customHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{isEditing ? 'Update Service' : 'New Service'}</Text>
            <Text style={styles.headerSubtitle}>Optimize your menu offering</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.mainCard}>
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
                
                <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                  <Sparkles size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Service name (e.g. Skin Fade)"
                    placeholderTextColor={Colors.textMuted}
                    value={formData.name}
                    onChangeText={t => setFormData({ ...formData, name: t })}
                  />
                </View>

                <View style={styles.priceRow}>
                  <View style={[styles.inputBox, { flex: 1 }, errors.price && styles.inputBoxError]}>
                    <IndianRupee size={16} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="Price"
                      keyboardType="number-pad"
                      value={formData.price ? String(formData.price) : ''}
                      onChangeText={t => setFormData({ ...formData, price: parseInt(t) || 0 })}
                    />
                  </View>
                  <View style={[styles.inputBox, { flex: 1.5, marginLeft: 12 }]}>
                    <Clock size={16} color={Colors.textSecondary} />
                    <Text style={styles.durationValue}>{formData.durationMinutes} minutes</Text>
                  </View>
                </View>

                {/* Duration Picker */}
                <View style={styles.durationGrid}>
                  {DURATION_OPTIONS.map(d => (
                    <TouchableOpacity 
                      key={d}
                      style={[styles.dChip, formData.durationMinutes === d && styles.dChipActive]}
                      onPress={() => setFormData({ ...formData, durationMinutes: d })}
                    >
                      <Text style={[styles.dChipText, formData.durationMinutes === d && styles.dChipTextActive]}>{d}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.inputSection, { marginTop: 32 }]}>
                <Text style={styles.sectionLabel}>CATEGORIZATION</Text>
                
                <View style={styles.inputBox}>
                  <LayoutGrid size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Category"
                    value={formData.category}
                    onChangeText={t => setFormData({ ...formData, category: t })}
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
                  {CATEGORY_PRESETS.map(p => (
                    <TouchableOpacity 
                      key={p} 
                      style={styles.pChip}
                      onPress={() => setFormData({ ...formData, category: p })}
                    >
                      <Text style={styles.pChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={[styles.inputSection, { marginTop: 32 }]}>
                <Text style={styles.sectionLabel}>DETAILED DESCRIPTION</Text>
                <View style={[styles.inputBox, { height: 120, alignItems: 'flex-start', paddingTop: 16 }]}>
                  <Info size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { textAlignVertical: 'top' }]}
                    placeholder="Details about inclusions, requirements, etc."
                    multiline
                    value={formData.description}
                    onChangeText={t => setFormData({ ...formData, description: t })}
                  />
                </View>
              </View>

              {isEditing && (
                <View style={styles.statusBox}>
                  <View style={styles.statusText}>
                    <Text style={styles.statusTitle}>Active Listing</Text>
                    <Text style={styles.statusSubtitle}>Service is visible to all customers.</Text>
                  </View>
                  <Switch
                    value={formData.isActive}
                    onValueChange={v => setFormData({ ...formData, isActive: v })}
                    trackColor={{ false: '#F1F5F9', true: Colors.primary100 }}
                    thumbColor={formData.isActive ? Colors.primary : Colors.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={styles.footerNote}>
              <ShieldCheck size={14} color="#94A3B8" />
              <Text style={styles.footerNoteText}>Verified professional listing protocol</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.actionFooter}>
          <TouchableOpacity 
            style={[styles.submitBtn, updateMutation.isPending && { opacity: 0.8 }]}
            onPress={handleSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{isEditing ? 'COMMIT UPDATES' : 'PUBLISH SERVICE'}</Text>
                <Zap size={18} color="#FFF" fill="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  scrollContent: {
    padding: 24,
  },
  mainCard: {
    backgroundColor: '#FFF',
    borderRadius: 36,
    padding: 28,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inputSection: {
    // Spacer
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  inputBoxError: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF1F2',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  durationValue: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  dChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  dChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  dChipTextActive: {
    color: Colors.primary,
  },
  presetScroll: {
    marginTop: 12,
    gap: 8,
  },
  pChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 24,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  footerNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  actionFooter: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 24,
    gap: 12,
    ...Shadows.glow,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
