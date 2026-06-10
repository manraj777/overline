import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Modal,
  TextInput,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Calendar, Camera, MapPin, Locate, X, ChevronDown } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { RootStackParamList } from '../../types';
import { InputField, PrimaryButton } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegisterProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'RegisterProfile'>;

const genderOptions = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export default function RegisterProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { name, email, password, phone } = route.params;
  const { signup, isLoading } = useAuthStore();

  const [selectedGender, setSelectedGender] = useState('Female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');

  // Location selector states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customAddress, setCustomAddress] = useState('');

  const onComplete = async () => {
    try {
      await signup({ name, email, password, phone });
    } catch {
      Alert.alert('Registration Failed', 'Could not complete setup. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeft color={Colors.primary600} size={24} />
            </TouchableOpacity>
            <View style={{ marginLeft: Spacing.lg }}>
              <Text style={styles.stepText}>STEP 4 OF 4</Text>
              <Text style={styles.title}>Profile Completion</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarPlaceholder}>
                <Camera color={Colors.textMuted} size={30} />
              </View>
              <TouchableOpacity style={styles.cameraFab}>
                <Camera color="#fff" size={16} />
              </TouchableOpacity>
            </View>
            <Text style={styles.uploadText}>Upload profile photo</Text>

            <Text style={styles.label}>Gender Identity</Text>
            <View style={styles.genderWrap}>
              {genderOptions.map(option => {
                const selected = option === selectedGender;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.genderChip, selected && styles.genderChipActive]}
                    onPress={() => setSelectedGender(option)}
                  >
                    <Text style={[styles.genderText, selected && styles.genderTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Date of Birth"
                  icon={<Calendar color={Colors.textSecondary} size={16} />}
                  placeholder="mm/dd/yyyy"
                  value={dob}
                  onChangeText={setDob}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelField}>Location</Text>
                <TouchableOpacity
                  style={styles.locationSelectorField}
                  onPress={() => setShowLocationModal(true)}
                >
                  <MapPin color={Colors.textSecondary} size={16} />
                  <Text style={[styles.locationSelectorText, city ? styles.locationSelectorTextActive : null]} numberOfLines={1}>
                    {city || 'Choose Location'}
                  </Text>
                  <ChevronDown color={Colors.textTertiary} size={14} />
                </TouchableOpacity>
              </View>
            </View>

            <PrimaryButton
              title={isLoading ? 'Completing...' : 'Complete Setup'}
              onPress={onComplete}
              loading={isLoading}
              style={styles.completeButton}
            />

            <Text style={styles.disclaimer}>
              By completing your profile, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location Selector Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* GPS Auto-detect */}
              <TouchableOpacity 
                style={styles.gpsOption}
                onPress={async () => {
                  setShowLocationModal(false);
                  let hasPermission = false;
                  if (Platform.OS === 'ios') {
                    const auth = await Geolocation.requestAuthorization('whenInUse');
                    hasPermission = auth === 'granted';
                  } else if (Platform.OS === 'android') {
                    const granted = await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                      {
                        title: 'Location Permission',
                        message: 'We need access to your location.',
                        buttonNeutral: 'Ask Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                      }
                    );
                    hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
                  }

                  if (hasPermission) {
                    Geolocation.getCurrentPosition(
                      async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        try {
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                            { headers: { 'User-Agent': 'OverlineApp/1.0' } }
                          );
                          const data = await response.json();
                          if (data && data.address) {
                            const cityVal = data.address.city || data.address.town || data.address.suburb || '';
                            const state = data.address.state || '';
                            setCity(cityVal ? `${cityVal}, ${state}` : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                          }
                        } catch {
                          setCity(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        }
                      },
                      (err) => Alert.alert('Error', 'Unable to fetch GPS: ' + err.message),
                      { enableHighAccuracy: true, timeout: 15000 }
                    );
                  } else {
                    Alert.alert('Permission Denied', 'Location permission is required to fetch current GPS location.');
                  }
                }}
              >
                <Locate size={18} color={Colors.primary} />
                <Text style={styles.gpsText}>Detect Current GPS Location</Text>
              </TouchableOpacity>

              {/* Manual Input Address */}
              <Text style={styles.modalSubtitle}>MANUAL ADDRESS SEARCH</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  value={customAddress}
                  onChangeText={setCustomAddress}
                  placeholder="Enter city or coordinates (e.g. Vidisha)"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.modalInput}
                />
                <TouchableOpacity 
                  style={styles.modalApplyBtn}
                  onPress={async () => {
                    if (!customAddress.trim()) return;
                    setShowLocationModal(false);
                    setCity(customAddress.trim());
                  }}
                >
                  <Text style={styles.modalApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {/* Popular Indian Cities */}
              <Text style={styles.modalSubtitle}>POPULAR CITIES</Text>
              <View style={styles.citiesGrid}>
                {[
                  { name: 'Vidisha' },
                  { name: 'Noida' },
                  { name: 'Greater Noida' },
                  { name: 'Delhi NCR' },
                  { name: 'Mumbai' },
                  { name: 'Bangalore' },
                  { name: 'Pune' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={styles.cityChip}
                    onPress={() => {
                      setShowLocationModal(false);
                      setCity(item.name);
                    }}
                  >
                    <MapPin size={12} color={Colors.textSecondary} />
                    <Text style={styles.cityChipText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4fb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 56,
    paddingBottom: Spacing['2xl'],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepText: {
    color: Colors.primary600,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
    fontSize: FontSizes.sm,
    marginBottom: 2,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary100,
    marginBottom: Spacing['2xl'],
  },
  progressFill: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary600,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.primary100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFab: {
    position: 'absolute',
    right: -4,
    bottom: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing['2xl'],
  },
  label: {
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  genderWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  genderChip: {
    backgroundColor: Colors.primary100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  genderChipActive: {
    backgroundColor: Colors.accent600,
    ...Shadows.sm,
  },
  genderText: {
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
    fontSize: FontSizes.md,
  },
  genderTextActive: {
    color: '#fff',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  completeButton: {
    height: 64,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    ...Shadows.lg,
  },
  disclaimer: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
  labelField: {
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.sm,
  },
  locationSelectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    height: 56,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  locationSelectorText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  locationSelectorTextActive: {
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: BorderRadius['2xl'] || 32,
    borderTopRightRadius: BorderRadius['2xl'] || 32,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  gpsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  gpsText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary || '#3B82F6',
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  modalApplyBtn: {
    backgroundColor: Colors.primary || '#3B82F6',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  modalApplyBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: FontSizes.sm,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.full || 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 6,
  },
  cityChipText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
});
