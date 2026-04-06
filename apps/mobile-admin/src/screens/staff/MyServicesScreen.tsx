import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows, Spacing, Radius } from '../../theme';
import { Service } from '../../types';
import { 
  Plus, 
  Scissors, 
  Clock, 
  IndianRupee, 
  Trash2, 
  ChevronRight, 
  Camera, 
  X,
  Sparkles,
  CalendarDays,
  Save,
  FileEdit
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyServicesScreen() {
  const queryClient = useQueryClient();
  const { selectedShopId } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    duration: '',
    price: '',
    category: 'Hair Styling',
    isDraft: false
  });

  const {
    data: services = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Service[]>({
    queryKey: ['staffMyServices', selectedShopId],
    queryFn: () => servicesApi.getAll(selectedShopId!).then(res => res.data || []),
    enabled: !!selectedShopId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => servicesApi.create(selectedShopId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMyServices'] });
      setShowAddModal(false);
      Alert.alert('Service Published', 'Your new specialty is now active.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(selectedShopId!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staffMyServices'] })
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const renderService = ({ item }: { item: Service }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1595475243695-469d2f679b8b?q=80&w=1000' }} 
        style={styles.cardImage} 
      />
      <View style={styles.cardMain}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={[styles.statusBadge, item.isActive ? styles.bgActive : styles.bgDraft]}>
            <Text style={[styles.statusText, item.isActive ? styles.textActive : styles.textDraft]}>
              {item.isActive ? 'ACTIVE' : 'DRAFT'}
            </Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaCol}>
            <Clock size={12} color="#94A3B8" />
            <Text style={styles.metaText}>{item.durationMinutes} MIN</Text>
          </View>
          <View style={styles.metaCol}>
            <IndianRupee size={12} color="#94A3B8" />
            <Text style={styles.metaText}>₹{item.price}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <FileEdit size={16} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => deleteMutation.mutate(item.id)}>
            <Trash2 size={16} color="#F43F5E" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Service Configurator</Text>
            <Text style={styles.subtitle}>{services.length} Specialized offerings live</Text>
          </View>
          <TouchableOpacity style={styles.addTrigger} onPress={() => setShowAddModal(true)}>
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={services}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Scissors size={48} color="#CBD5E1" strokeWidth={1} />
              <Text style={styles.emptyTitle}>No Specialties Registered</Text>
              <Text style={styles.emptySubtitle}>Add your services to start receiving bookings.</Text>
            </View>
          }
          renderItem={renderService}
        />

        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modal}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add Specialty</Text>
                  <Text style={styles.modalSubtitle}>Define a new service for your profile</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAddModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.photoUpload}>
                  <Camera size={24} color="#CBD5E1" />
                  <Text style={styles.photoHint}>Uplaod Service Display Photo</Text>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SERVICE NAME</Text>
                  <TextInput 
                    style={styles.inputBox} 
                    placeholder="e.g. Deep Tissue Therapy" 
                    value={form.name}
                    onChangeText={t => setForm({...form, name: t})}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>DURATION (MIN)</Text>
                    <View style={styles.inputBoxSmall}>
                      <Clock size={16} color="#94A3B8" />
                      <TextInput 
                        style={styles.inputSmall} 
                        placeholder="30" 
                        keyboardType="number-pad" 
                        value={form.duration}
                        onChangeText={t => setForm({...form, duration: t})}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.label}>PRICE (INR)</Text>
                    <View style={styles.inputBoxSmall}>
                      <IndianRupee size={14} color="#94A3B8" />
                      <TextInput 
                        style={styles.inputSmall} 
                        placeholder="499" 
                        keyboardType="number-pad"
                        value={form.price}
                        onChangeText={t => setForm({...form, price: t})}
                      />
                    </View>
                  </View>
                </View>

                <View style={[styles.inputGroup, { marginBottom: 32 }]}>
                  <Text style={styles.label}>AVAILABILITY SCHEDULE</Text>
                  <TouchableOpacity style={styles.scheduleSelector}>
                    <CalendarDays size={18} color={Colors.primary} />
                    <Text style={styles.scheduleText}>Available All Days (09:00 - 21:00)</Text>
                    <ChevronRight size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={() => createMutation.mutate({ ...form, durationMinutes: parseInt(form.duration), price: parseFloat(form.price) })}
                >
                  <Text style={styles.submitText}>PUBLISH SERVICE</Text>
                  <Sparkles size={18} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.draftBtn} onPress={() => setShowAddModal(false)}>
                  <Save size={16} color="#64748B" />
                  <Text style={styles.draftText}>Save as Draft</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '700', marginTop: 4 },
  addTrigger: { width: 44, height: 44, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  list: { padding: 24, paddingTop: 0 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 12, marginBottom: 16, flexDirection: 'row', borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  cardImage: { width: 100, height: 100, borderRadius: 18 },
  cardMain: { flex: 1, marginLeft: 16, paddingVertical: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bgActive: { backgroundColor: '#F0FDF4' },
  bgDraft: { backgroundColor: '#F8FAFC' },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  textActive: { color: '#10B981' },
  textDraft: { color: '#94A3B8' },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 'auto', alignSelf: 'flex-end' },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  modal: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '800', marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  modalForm: { flex: 0 },
  photoUpload: { width: '100%', height: 120, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  photoHint: { fontSize: 12, fontWeight: '800', color: '#CBD5E1', marginTop: 12 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputBox: { backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 50, fontSize: 14, fontWeight: '700', color: '#0F172A', borderWidth: 1, borderColor: '#F1F5F9' },
  row: { flexDirection: 'row' },
  inputBoxSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  inputSmall: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  scheduleSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  scheduleText: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  submitBtn: { backgroundColor: Colors.primary, height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...Shadows.glow },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  draftBtn: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  draftText: { color: '#64748B', fontSize: 13, fontWeight: '800' },
});
