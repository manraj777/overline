import React from 'react';
import {
  View,
  Text,
  SectionList,
  Image,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
  FlatList,
  ScrollView,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Scissors} from 'lucide-react-native';
import {servicesApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {RootStackParamList, Service} from '../../types';

const SUGGESTION_CATEGORIES = [
  { id: 'SALON_MENS', label: "Men's Salon" },
  { id: 'SALON_WOMENS', label: "Women's Salon" },
  { id: 'SALON_UNISEX', label: 'Unisex Salon' },
  { id: 'CLINIC', label: 'Clinic' },
  { id: 'SPA', label: 'Spa' },
  { id: 'GYM', label: 'Gym' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ServicesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const {selectedShopId, isOwner} = useAuthStore();

  const [selectedCategory, setSelectedCategory] = React.useState<string>('SALON_MENS');

  const {
    data: services = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Service[]>({
    queryKey: ['adminServices', selectedShopId],
    queryFn: () =>
      servicesApi.getAll(selectedShopId || '').then(res => res.data),
    enabled: !!selectedShopId,
  });

  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['suggestedServices', selectedCategory],
    queryFn: () => servicesApi.getSuggestions(selectedCategory).then(res => res.data),
    enabled: !!selectedShopId && !!selectedCategory,
  });

  const toggleMutation = useMutation({
    mutationFn: (service: Service) =>
      servicesApi.update(service.id, {isActive: !service.isActive}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminServices']});
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update service',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: string) =>
      servicesApi.delete(selectedShopId || '', serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminServices']});
      Alert.alert('Success', 'Service deleted');
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to delete service',
      );
    },
  });

  const addFromSuggestionMutation = useMutation({
    mutationFn: (suggestion: any) =>
      servicesApi.create(selectedShopId || '', {
        name: suggestion.name,
        price: suggestion.price,
        durationMinutes: suggestion.durationMinutes,
        description: suggestion.description,
        category: suggestion.category,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminServices']});
      Alert.alert('Success', 'Suggested service added successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add service');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => servicesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['adminServices']});
      Alert.alert('Success', 'Service approved successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve service');
    },
  });

  const handleToggleActive = (service: Service) => {
    toggleMutation.mutate(service);
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(service.id),
        },
      ],
    );
  };

  const handleEdit = (service: Service) => {
    navigation.navigate('ServiceForm', {
      shopId: selectedShopId || '',
      serviceId: service.id,
    });
  };

  const handleAdd = () => {
    navigation.navigate('ServiceForm', {shopId: selectedShopId || ''});
  };

  const approvedServices = services.filter(s => s.isApproved !== false);
  const pendingServices = services.filter(s => s.isApproved === false);

  // Group services by category
  const servicesByCategory = approvedServices.reduce((acc: any, service: Service) => {
    const cat = service.category || 'General';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(service);
    return acc;
  }, {});

  const sections = Object.keys(servicesByCategory).map(category => ({
    title: category,
    data: servicesByCategory[category],
  }));

  const renderService = ({item}: {item: Service}) => (
    <View style={styles.serviceCard}>
      <View style={{flexDirection: 'row', gap: 12, marginBottom: 12}}>
        <Image 
          source={item.imageUrl ? { uri: item.imageUrl } : { uri: 'https://images.unsplash.com/photo-1595475243695-469d2f679b8b?q=80&w=1000' }} 
          style={styles.serviceImage} 
        />
        <View style={styles.serviceMain}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.serviceDetails}>
              <Text style={styles.servicePrice}>₹{item.price}</Text>
              <Text style={styles.serviceDuration}>
                • {item.durationMinutes} min
              </Text>
            </View>
          </View>

          <View style={styles.toggleContainer}>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{false: '#E5E7EB', true: '#C7D2FE'}}
              thumbColor={item.isActive ? '#4F46E5' : '#9CA3AF'}
            />
          </View>
        </View>
      </View>

      <View style={styles.serviceActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerComponent}>
      {/* Suggestions Section */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeaderTitle}>AI-Suggested Services</Text>
        <Text style={styles.sectionHeaderSubtitle}>Quickly set up standard services for your business</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
        {SUGGESTION_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoadingSuggestions ? (
        <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestions}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.suggestionCard}>
              <Text style={styles.suggestionName}>{item.name}</Text>
              <Text style={styles.suggestionDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.suggestionMeta}>
                <Text style={styles.suggestionPrice}>₹{item.price}</Text>
                <Text style={styles.suggestionDuration}>{item.durationMinutes}m</Text>
              </View>
              <TouchableOpacity
                style={styles.suggestionAddBtn}
                disabled={addFromSuggestionMutation.isPending}
                onPress={() => addFromSuggestionMutation.mutate(item)}
              >
                <Text style={styles.suggestionAddBtnText}>+ Quick Add</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.suggestionsListContent}
        />
      )}

      {/* Pending Approval Section */}
      {pendingServices.length > 0 && (
        <View style={styles.pendingSection}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderTitle}>Pending Staff Services</Text>
            <Text style={styles.sectionHeaderSubtitle}>Services created by staff requiring approval</Text>
          </View>
          {pendingServices.map(item => (
            <View key={item.id} style={styles.pendingCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingName}>{item.name}</Text>
                <Text style={styles.pendingDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.pendingMeta}>₹{item.price} • {item.durationMinutes} min</Text>
              </View>
              {isOwner ? (
                <TouchableOpacity
                  style={styles.approveBtn}
                  disabled={approveMutation.isPending}
                  onPress={() => approveMutation.mutate(item.id)}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Pending</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Approved Services Header */}
      {approvedServices.length > 0 && (
        <View style={[styles.sectionHeaderContainer, { marginTop: 24, marginBottom: 8 }]}>
          <Text style={styles.sectionHeaderTitle}>Active Services</Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Scissors size={56} color="#9CA3AF" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Services Yet</Text>
      <Text style={styles.emptySubtitle}>
        Add services that customers can book
      </Text>
      <TouchableOpacity style={styles.addEmptyButton} onPress={handleAdd}>
        <Text style={styles.addEmptyButtonText}>+ Add First Service</Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Services List */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderTitle}>{title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={renderService}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#4F46E5']}
          />
        }
      />
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
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  serviceDuration: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  serviceCategory: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  toggleContainer: {
    justifyContent: 'center',
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  addEmptyButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addEmptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  categoryHeader: {
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    marginTop: 16,
    marginBottom: 8,
  },
  categoryHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 1,
  },
  headerComponent: {
    backgroundColor: '#F9FAFB',
    paddingBottom: 8,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chipsScroll: {
    marginVertical: 8,
  },
  chipsContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
  suggestionsListContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 12,
  },
  suggestionCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  suggestionDesc: {
    fontSize: 11,
    color: '#6B7280',
    height: 32,
    marginBottom: 8,
  },
  suggestionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  suggestionDuration: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  suggestionAddBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  suggestionAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  pendingSection: {
    marginTop: 20,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  pendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  pendingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginVertical: 2,
  },
  pendingMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  approveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
