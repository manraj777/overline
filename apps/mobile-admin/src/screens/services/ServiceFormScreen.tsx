import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';
import {servicesApi} from '../../api/client';
import {RootStackParamList, ServiceFormData} from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'ServiceForm'>;

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export default function ServiceFormScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {shopId, serviceId} = route.params;
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

  const {data: existingService, isLoading: loadingService} = useQuery({
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
        price: existingService.price,
        durationMinutes: existingService.durationMinutes,
        category: existingService.category || '',
        isActive: existingService.isActive,
      });
    }
  }, [existingService]);

  const createMutation = useMutation({
    mutationFn: (data: ServiceFormData) =>
      servicesApi.create(shopId, {
        name: data.name,
        price: data.price,
        durationMinutes: data.durationMinutes,
        description: data.description,
        category: data.category,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminServices']});
      Alert.alert('Success', 'Service created successfully');
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create service',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ServiceFormData) =>
      servicesApi.update(serviceId!, {
        name: data.name,
        price: data.price,
        durationMinutes: data.durationMinutes,
        description: data.description,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminServices']});
      Alert.alert('Success', 'Service updated successfully');
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update service',
      );
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.durationMinutes <= 0) {
      newErrors.duration = 'Duration must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (loadingService) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Service Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={text => setFormData({...formData, name: text})}
            placeholder="e.g., Haircut, Beard Trim"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={text => setFormData({...formData, description: text})}
            placeholder="Brief description of the service"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            value={formData.price ? String(formData.price) : ''}
            onChangeText={text =>
              setFormData({...formData, price: parseInt(text) || 0})
            }
            placeholder="Enter price"
            keyboardType="number-pad"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        {/* Duration */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration *</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map(duration => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationOption,
                  formData.durationMinutes === duration &&
                    styles.durationOptionSelected,
                ]}
                onPress={() =>
                  setFormData({...formData, durationMinutes: duration})
                }>
                <Text
                  style={[
                    styles.durationText,
                    formData.durationMinutes === duration &&
                      styles.durationTextSelected,
                  ]}>
                  {duration} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.duration && (
            <Text style={styles.errorText}>{errors.duration}</Text>
          )}
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.category}
            onChangeText={text => setFormData({...formData, category: text})}
            placeholder="e.g., Hair, Beard, Grooming"
          />
        </View>

        {/* Active Status (only for editing) */}
        {isEditing && (
          <View style={styles.switchGroup}>
            <View>
              <Text style={styles.label}>Active</Text>
              <Text style={styles.switchDescription}>
                Inactive services won't be shown to customers
              </Text>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={value =>
                setFormData({...formData, isActive: value})
              }
              trackColor={{false: '#E5E7EB', true: '#C7D2FE'}}
              thumbColor={formData.isActive ? '#4F46E5' : '#9CA3AF'}
            />
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Update Service' : 'Create Service'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  durationOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  durationText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  durationTextSelected: {
    color: '#fff',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  switchDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
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
