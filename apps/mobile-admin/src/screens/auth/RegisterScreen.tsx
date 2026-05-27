import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shopApi } from '../../api/client';
import { Colors, Shadows } from '../../theme';
import { RootStackParamList } from '../../types';
import {
  User,
  Mail,
  Smartphone,
  Store,
  MapPin,
  Clock,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Lock,
  Sparkles,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SHOP_TYPES = [
  { value: 'SALON', label: 'Salon & Styling' },
  { value: 'CLINIC', label: 'Medical Clinic' },
  { value: 'SPA', label: 'Spa & Wellness' },
  { value: 'GYM', label: 'Gym & Fitness' },
  { value: 'OTHER', label: 'Other Business' },
];

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Owner Info
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Shop Info
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('SALON');
  const [shopDescription, setShopDescription] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Step 3: Location & Config
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Vidisha');
  const [state, setState] = useState('Madhya Pradesh');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState('23.5251'); // Default to Vidisha coords
  const [longitude, setLongitude] = useState('77.8224');
  const [timing, setTiming] = useState('09:00 AM - 09:00 PM');
  const [googleLink, setGoogleLink] = useState('');

  const [isParsingLink, setIsParsingLink] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      let hasPermission = false;
      if (Platform.OS === 'ios') {
        hasPermission = true; 
      } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Overline requires access to your location to set the shop location.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        hasPermission = true;
      }

      if (hasPermission) {
        (navigator as any).geolocation.getCurrentPosition(
          (pos: any) => {
            setLatitude(String(pos.coords.latitude));
            setLongitude(String(pos.coords.longitude));
            setIsGettingLocation(false);
            Alert.alert('Success', 'Updated coordinates to current GPS location!');
          },
          (err: any) => {
            setIsGettingLocation(false);
            Alert.alert('Location Error', 'Failed to get current GPS location. Please enter manually.');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        setIsGettingLocation(false);
        Alert.alert('Permission Denied', 'Location permission is required.');
      }
    } catch (err: any) {
      setIsGettingLocation(false);
      Alert.alert('Error', err.message || 'Could not request location permission.');
    }
  };

  const handleParseGoogleLink = async () => {
    if (!googleLink.trim()) {
      return Alert.alert('Error', 'Please paste a Google Map link first.');
    }
    setIsParsingLink(true);
    try {
      const res = await shopApi.parseGoogleLink(googleLink.trim());
      const data = res.data;
      if (data) {
        if (data.latitude) setLatitude(String(data.latitude));
        if (data.longitude) setLongitude(String(data.longitude));
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.state) setState(data.state);
        if (data.postalCode) setPostalCode(data.postalCode);
        if (data.shopName && !shopName) setShopName(data.shopName);
        Alert.alert('Success', 'Address and coordinates populated from Google Map Link!');
      }
    } catch (e: any) {
      Alert.alert('Parse Failed', e.response?.data?.message || 'Could not parse Google Map link. You can enter details manually.');
    } finally {
      setIsParsingLink(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!ownerName.trim()) return Alert.alert('Error', 'Owner name is required');
      if (!ownerEmail.trim() || !ownerEmail.includes('@')) return Alert.alert('Error', 'Valid owner email is required');
      if (!/^[6-9]\d{9}$/.test(ownerPhone.replace(/\D/g, ''))) return Alert.alert('Error', 'Valid 10-digit owner phone is required');
      if (!password.trim() || password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    } else if (step === 2) {
      if (!shopName.trim()) return Alert.alert('Error', 'Shop name is required');
      if (shopPhone && !/^[6-9]\d{9}$/.test(shopPhone.replace(/\D/g, ''))) return Alert.alert('Error', 'Shop phone must be a 10-digit number');
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!address.trim()) return Alert.alert('Error', 'Address is required');
    if (!city.trim()) return Alert.alert('Error', 'City is required');
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return Alert.alert('Error', 'Latitude and longitude must be valid numbers');
    }

    setIsLoading(true);
    try {
      const payload = {
        email: ownerEmail.trim().toLowerCase(),
        password: password,
        ownerName: ownerName.trim(),
        ownerPhone: `+91${ownerPhone.replace(/\D/g, '')}`,
        phoneVerified: true,
        emailVerified: true,
        shopName: shopName.trim(),
        shopType,
        shopDescription: shopDescription.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        latitude: latNum,
        longitude: lngNum,
        phone: shopPhone ? `+91${shopPhone.replace(/\D/g, '')}` : undefined,
        googleLink: googleLink.trim() || undefined,
        timing: timing.trim() || undefined,
      };

      await shopApi.registerShop(payload);
      setIsSuccess(true);
    } catch (e: any) {
      Alert.alert('Registration Failed', e.response?.data?.message || 'Could not submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successWrapper}>
          <CheckCircle2 size={80} color="#10B981" />
          <Text style={styles.successTitle}>Registration Submitted!</Text>
          <Text style={styles.successText}>
            Thank you for applying to Overline Business. Our operations team will verify your details and email/call you to activate your partner portal.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.successBtnText}>BACK TO LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={step === 1 ? () => navigation.goBack() : prevStep}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Register Partner</Text>
            <Text style={styles.subtitle}>Step {step} of 3</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[
                styles.progressBar,
                s <= step ? styles.progressBarActive : styles.progressBarInactive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Owner Credentials</Text>
              <Text style={styles.sectionDesc}>
                Provide details for the primary account owner. A confirmation email will be sent here.
              </Text>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Full Name</Text>
              </View>
              <View style={styles.inputBox}>
                <User size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rajesh Kumar"
                  value={ownerName}
                  onChangeText={setOwnerName}
                />
              </View>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Email Address</Text>
              </View>
              <View style={styles.inputBox}>
                <Mail size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. rajesh@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={ownerEmail}
                  onChangeText={setOwnerEmail}
                />
              </View>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Mobile Phone</Text>
              </View>
              <View style={styles.inputBox}>
                <Smartphone size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  keyboardType="phone-pad"
                  value={ownerPhone}
                  onChangeText={t => setOwnerPhone(t.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
              </View>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={styles.inputBox}>
                <Lock size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 characters"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Shop Information</Text>
              <Text style={styles.sectionDesc}>
                Set up details about your shop/salon that customers will see.
              </Text>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Shop/Saloon Name</Text>
              </View>
              <View style={styles.inputBox}>
                <Store size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Luxury Cuts Salon"
                  value={shopName}
                  onChangeText={setShopName}
                />
              </View>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Shop Category Type</Text>
              </View>
              <TouchableOpacity
                style={styles.inputBox}
                activeOpacity={0.9}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Compass size={18} color="#94A3B8" />
                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 18 }]}>
                  {SHOP_TYPES.find(t => t.value === shopType)?.label || 'Salon & Styling'}
                </Text>
                <ChevronDown size={18} color="#94A3B8" />
              </TouchableOpacity>

              {showTypeDropdown && (
                <View style={styles.dropdown}>
                  {SHOP_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setShopType(type.value);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          shopType === type.value && styles.dropdownItemTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Shop Mobile (Optional)</Text>
              </View>
              <View style={styles.inputBox}>
                <Smartphone size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Public contact phone"
                  keyboardType="phone-pad"
                  value={shopPhone}
                  onChangeText={t => setShopPhone(t.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
              </View>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Shop Description (Optional)</Text>
              </View>
              <View style={[styles.inputBox, styles.textAreaBox]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="About your saloon, facilities, etc."
                  multiline
                  numberOfLines={4}
                  value={shopDescription}
                  onChangeText={setShopDescription}
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Location & Coordinates</Text>
              <Text style={styles.sectionDesc}>
                We plot your shop on map. Please input precise coordinates for the navigation pins.
              </Text>

              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Full Address</Text>
              </View>
              <View style={styles.inputBox}>
                <MapPin size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Street, Landmark, Area"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <View style={[styles.inputBox, { marginTop: 4 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <View style={[styles.inputBox, { marginTop: 4 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="State"
                      value={state}
                      onChangeText={setState}
                    />
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Latitude</Text>
                  <View style={[styles.inputBox, { marginTop: 4 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="23.5251"
                      keyboardType="numeric"
                      value={latitude}
                      onChangeText={setLatitude}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Longitude</Text>
                  <View style={[styles.inputBox, { marginTop: 4 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="77.8224"
                      keyboardType="numeric"
                      value={longitude}
                      onChangeText={setLongitude}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.locationHelperBtn}
                onPress={handleGetCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Compass size={16} color="#3B82F6" />
                    <Text style={styles.locationHelperText}>GET CURRENT GPS LOCATION</Text>
                  </>
                )}
              </TouchableOpacity>
 
              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Opening Hours Timing</Text>
              </View>
              <View style={styles.inputBox}>
                <Clock size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 09:00 AM - 09:00 PM"
                  value={timing}
                  onChangeText={setTiming}
                />
              </View>
 
              <View style={styles.inputLabelWrap}>
                <Text style={styles.inputLabel}>Google Map Link (Optional)</Text>
              </View>
              <View style={styles.inputBox}>
                <MapPin size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="https://maps.google.com/..."
                  value={googleLink}
                  onChangeText={setGoogleLink}
                />
              </View>

              <TouchableOpacity
                style={styles.locationHelperBtn}
                onPress={handleParseGoogleLink}
                disabled={isParsingLink}
              >
                {isParsingLink ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Sparkles size={16} color="#3B82F6" />
                    <Text style={styles.locationHelperText}>AUTO-FILL FROM GOOGLE MAP LINK</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            {step > 1 && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
                <Text style={styles.secondaryBtnText}>BACK</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, step === 1 && { width: '100%' }]}
              onPress={step === 3 ? handleSubmit : nextStep}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {step === 3 ? 'SUBMIT FOR REVIEW' : 'CONTINUE'}
                  </Text>
                  <ArrowRight size={16} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFF',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: '100%',
  },
  progressBarActive: {
    backgroundColor: Colors.primary,
  },
  progressBarInactive: {
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 20,
  },
  inputLabelWrap: {
    marginTop: 16,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  textAreaBox: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  textArea: {
    height: '100%',
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    padding: 8,
    ...Shadows.sm,
  },
  dropdownItem: {
    padding: 12,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  dropdownItemTextActive: {
    color: Colors.primary,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 18,
    gap: 8,
    ...Shadows.glow,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: {
    width: 100,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 18,
  },
  secondaryBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900',
  },
  // Success state styles
  successWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFF',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 24,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 32,
  },
  successBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  successBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  locationHelperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  locationHelperText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3B82F6',
  },
});
