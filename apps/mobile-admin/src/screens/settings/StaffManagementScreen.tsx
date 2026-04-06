import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  UsersRound, 
  X, 
  Plus, 
  UserPlus2, 
  Trash2, 
  RotateCcw,
  ChevronRight, 
  Phone, 
  Fingerprint, 
  User, 
  Calendar,
  Lock,
  Search
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { staffApi } from '../../api/client';
import { RootStackParamList, Staff } from '../../types';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

type RouteProps = RouteProp<RootStackParamList, 'StaffManagement'>;

interface StaffFormData {
  name: string;
  phone: string;
  age: string;
  password: string; // 6-digit number
}

const emptyForm: StaffFormData = {
  name: '',
  phone: '',
  age: '',
  password: '',
};

export default function StaffManagementScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { selectedShopId } = useAuthStore();
  const shopId = (route.params as any)?.shopId || selectedShopId || '';
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    data: staffList = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Staff[]>({
    queryKey: ['adminStaff', shopId],
    queryFn: () => staffApi.getAll(shopId).then(res => res.data || []),
    enabled: !!shopId,
  });

  if (!shopId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No shop selected</Text>
        <Text style={styles.emptySubtitle}>Select a shop first to manage staff.</Text>
      </View>
    );
  }

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => staffApi.create(shopId, { 
      ...data, 
      age: parseInt(data.age) || undefined,
      role: 'STAFF' 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStaff', shopId] });
      setShowForm(false);
      setFormData(emptyForm);
      Alert.alert('Onboarding Successful', `${formData.name} is now a part of your shop.`);
    },
    onError: (error: any) => {
      Alert.alert('Onboarding Failed', error.response?.data?.message || 'Check connection.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (staffId: string) => staffApi.delete(shopId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStaff', shopId] });
      Alert.alert('Removed', 'Staff member has been successfully offboarded.');
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: ({ staffId, password }: { staffId: string; password?: string }) =>
      staffApi.resetPin(shopId, staffId, password),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Required';
    if (!formData.phone.trim()) e.phone = 'Required';
    if (!/^\d{6}$/.test(formData.password)) e.password = 'Must be 6 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRemove = (staff: Staff) => {
    Alert.alert(
      'Offboard Staff',
      `Are you sure you want to remove ${staff.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove Staff', style: 'destructive', onPress: () => deleteMutation.mutate(staff.id) },
      ]
    );
  };

  const renderStaffItem = ({ item }: { item: Staff }) => (
    <View style={styles.staffCard}>
      <View style={styles.staffMain}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phoneText}>{item.phone || 'No phone'}</Text>
          <View style={styles.tagRow}>
            <View style={styles.ageTag}>
              <Text style={styles.tagText}>{item.age || 24} YRS</Text>
            </View>
            <View style={styles.roleTag}>
              <Text style={styles.tagText}>{item.role}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.actionCol}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={async () => {
            try {
              const result = await resetPinMutation.mutateAsync({ staffId: item.id });
              const pin = result.data?.password;
              Alert.alert('PIN Reset', `${item.name} new 6-digit PIN: ${pin}`);
            } catch (error: any) {
              Alert.alert('Reset Failed', error?.response?.data?.message || 'Unable to reset staff PIN');
            }
          }}
        >
          <RotateCcw size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
          <Trash2 size={18} color="#F43F5E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Team Management</Text>
            <Text style={styles.subtitle}>{staffList.length} Active specialists on-site</Text>
          </View>
          <TouchableOpacity style={styles.addTrigger} onPress={() => setShowForm(true)}>
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput placeholder="Search staff members..." style={styles.searchInput} placeholderTextColor="#94A3B8" />
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : (
          <FlatList
            data={staffList}
            keyExtractor={item => item.id}
            renderItem={renderStaffItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <UserPlus2 size={48} color="#CBD5E1" strokeWidth={1} />
                <Text style={styles.emptyTitle}>Empty Workspace</Text>
                <Text style={styles.emptySubtitle}>You haven't onboarded any staff members to this shop yet.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
                  <Text style={styles.emptyBtnText}>START ONBOARDING</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        <Modal visible={showForm} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modal}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Onboard Specialist</Text>
                  <Text style={styles.modalSubtitle}>Initialize a new staff profile</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowForm(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <View style={[styles.inputBox, errors.name && styles.inputError]}>
                    <User size={16} color="#94A3B8" />
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Rahul Sharma" 
                      value={formData.name}
                      onChangeText={t => setFormData({ ...formData, name: t })}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>MOBILE NUMBER</Text>
                    <View style={[styles.inputBox, errors.phone && styles.inputError]}>
                      <Phone size={16} color="#94A3B8" />
                      <TextInput 
                        style={styles.input} 
                        placeholder="+91" 
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={t => setFormData({ ...formData, phone: t })}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { width: 100, marginLeft: 12 }]}>
                    <Text style={styles.label}>AGE</Text>
                    <View style={styles.inputBox}>
                      <Calendar size={16} color="#94A3B8" />
                      <TextInput 
                        style={styles.input} 
                        placeholder="24" 
                        keyboardType="number-pad"
                        value={formData.age}
                        onChangeText={t => setFormData({ ...formData, age: t })}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>ASSING AUTH PASSWORD (6-DIGIT)</Text>
                  <View style={[styles.inputBox, errors.password && styles.inputError]}>
                    <Lock size={16} color="#94A3B8" />
                    <TextInput 
                      style={styles.input} 
                      placeholder="123456" 
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                      value={formData.password}
                      onChangeText={t => setFormData({ ...formData, password: t })}
                    />
                  </View>
                  <Text style={styles.helpText}>Staff will use this code to login after selecting the shop.</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={() => validate() && createMutation.mutate(formData)}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>FINALIZE ONBOARDING</Text>
                      <Fingerprint size={18} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  addTrigger: { width: 44, height: 44, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, paddingHorizontal: 16, height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  list: { padding: 24 },
  staffCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  staffMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  avatarText: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  info: { marginLeft: 16, flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  phoneText: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  ageTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleTag: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
  removeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },
  actionCol: { gap: 8 },
  resetBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 20 },
  emptyBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, marginTop: 24 },
  emptyBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  modal: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  modalForm: { flex: 0 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: '#F1F5F9' },
  inputError: { borderColor: '#FECACA', backgroundColor: '#FFF1F2' },
  input: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  row: { flexDirection: 'row' },
  helpText: { fontSize: 11, color: '#94A3B8', marginTop: 8, marginLeft: 4, fontWeight: '600' },
  submitBtn: { backgroundColor: Colors.primary, height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, ...Shadows.glow },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});
