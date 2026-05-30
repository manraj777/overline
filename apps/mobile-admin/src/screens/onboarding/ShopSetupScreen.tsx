import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {useAuthStore} from '../../stores/authStore';
import {shopApi} from '../../api/client';
import {
  Rocket,
  Scissors,
  Building2,
  User,
  Sparkles,
  MoreHorizontal,
  ChevronRight,
  LogOut
} from 'lucide-react-native';

const ShopSetupScreen: React.FC = () => {
  const {user, checkAuth, logout} = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'SALON',
    address: '',
    city: '',
    description: '',
  });

  const [mapLink, setMapLink] = useState('');
  const [parsingLink, setParsingLink] = useState(false);

  const handleParseMapLink = async () => {
    if (!mapLink) {
      Alert.alert('Required', 'Please paste a valid Google Maps link.');
      return;
    }
    setParsingLink(true);
    try {
      const { data } = await shopApi.parseGoogleLink(mapLink);
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          address: data.address || prev.address,
          city: data.city || prev.city,
        }));
        Alert.alert('Success', 'Shop details fetched from map link!');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Failed to parse map link';
      Alert.alert('Error', message);
    } finally {
      setParsingLink(false);
    }
  };

  const categories = [
    { label: 'Salon', value: 'SALON', icon: Scissors },
    { label: 'Clinic', value: 'CLINIC', icon: Building2 },
    { label: 'Barber', value: 'BARBER', icon: User },
    { label: 'Spa', value: 'SPA', icon: Sparkles },
    { label: 'Other', value: 'OTHER', icon: MoreHorizontal },
  ] as const;

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await shopApi.createShop(formData);
      await checkAuth();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create shop. Please try again.';
      Alert.alert('Setup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Rocket size={40} color="#3B82F6" strokeWidth={2.5} />
              </View>
              <Text style={styles.title}>Welcome, {user?.name}!</Text>
              <Text style={styles.subtitle}>
                Let's set up your first shop to get started with Overline.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.autofillSection}>
                <View style={styles.autofillHeader}>
                  <Sparkles size={16} color="#3B82F6" />
                  <Text style={styles.autofillTitle}>Autofill with Google Maps Link</Text>
                </View>
                <View style={styles.autofillInputRow}>
                  <TextInput
                    style={[styles.input, styles.autofillInput]}
                    placeholder="https://maps.app.goo.gl/..."
                    value={mapLink}
                    onChangeText={setMapLink}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.autofillButton, parsingLink && styles.autofillButtonDisabled]}
                    onPress={handleParseMapLink}
                    disabled={parsingLink || !mapLink}
                  >
                    {parsingLink ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.autofillButtonText}>Autofill</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.autofillSubtitle}>
                  Paste your shop's Google Maps link to instantly fetch name, address, and city.
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Skyline Unisex Salon"
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Category *</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = formData.type === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.categoryItem,
                          isSelected && styles.categoryItemSelected
                        ]}
                        onPress={() => setFormData({...formData, type: cat.value as any})}
                      >
                        <Icon 
                          size={24} 
                          color={isSelected ? '#3B82F6' : '#64748B'} 
                        />
                        <Text style={[
                          styles.categoryLabel,
                          isSelected && styles.categoryLabelSelected
                        ]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Street name, landmark..."
                  multiline
                  numberOfLines={3}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell customers about your business..."
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Complete Setup</Text>
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <LogOut size={16} color="#EF4444" style={{marginRight: 8}} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  categoryItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  autofillSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  autofillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  autofillTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  autofillInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  autofillInput: {
    flex: 1,
    marginBottom: 0,
    height: 44,
    borderColor: '#93C5FD',
  },
  autofillButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autofillButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  autofillButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  autofillSubtitle: {
    fontSize: 11,
    color: '#60A5FA',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  logoutButton: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShopSetupScreen;
