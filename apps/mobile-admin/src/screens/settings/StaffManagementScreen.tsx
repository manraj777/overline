import React, {useState} from 'react';
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
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRoute, RouteProp} from '@react-navigation/native';
import {staffApi} from '../../api/client';
import {RootStackParamList, Staff} from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'StaffManagement'>;

interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
}

const emptyForm: StaffFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'STAFF',
};

export default function StaffManagementScreen() {
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const {shopId} = route.params;
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
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

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => staffApi.create(shopId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminStaff', shopId]});
      setShowForm(false);
      setFormData(emptyForm);
      Alert.alert('Success', 'Staff member added');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to add staff',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({id, data}: {id: string; data: StaffFormData}) =>
      staffApi.update(shopId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminStaff', shopId]});
      setShowForm(false);
      setEditingStaff(null);
      setFormData(emptyForm);
      Alert.alert('Success', 'Staff member updated');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update staff',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (staffId: string) => staffApi.delete(shopId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminStaff', shopId]});
      Alert.alert('Success', 'Staff member removed');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to remove staff',
      );
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editingStaff) {
      updateMutation.mutate({id: editingStaff.id, data: formData});
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: '',
      role: staff.role,
    });
    setShowForm(true);
  };

  const handleDelete = (staff: Staff) => {
    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove ${staff.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(staff.id),
        },
      ],
    );
  };

  const handleAdd = () => {
    setEditingStaff(null);
    setFormData(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const renderStaffItem = ({item}: {item: Staff}) => (
    <View style={styles.staffCard}>
      <View style={styles.staffAvatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.name}</Text>
        <Text style={styles.staffEmail}>{item.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {item.role === 'OWNER' ? 'Owner' : 'Staff'}
          </Text>
        </View>
      </View>
      <View style={styles.staffActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        {item.role !== 'OWNER' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}>
            <Text style={styles.deleteButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {staffList.length} Staff Member{staffList.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staffList}
        keyExtractor={item => item.id}
        renderItem={renderStaffItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Staff Members</Text>
            <Text style={styles.emptySubtitle}>
              Add staff to help manage your shop
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAdd}>
              <Text style={styles.emptyButtonText}>Add First Staff</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff' : 'Add Staff'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  setEditingStaff(null);
                  setErrors({});
                }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={text =>
                    setFormData({...formData, name: text})
                  }
                  placeholder="Staff member name"
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={text =>
                    setFormData({...formData, email: text})
                  }
                  placeholder="staff@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={text =>
                    setFormData({...formData, phone: text})
                  }
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (createMutation.isPending || updateMutation.isPending) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }>
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingStaff ? 'Update Staff' : 'Add Staff'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  staffEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '500',
  },
  staffActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  editButtonText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },
  modalForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
