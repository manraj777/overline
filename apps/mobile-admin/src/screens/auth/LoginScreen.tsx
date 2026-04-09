import React, { useState, useEffect } from 'react';
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
  Image,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows } from '../../theme';
import { RootStackParamList } from '../../types';
import { Config } from '../../config';
import { 
  Smartphone, 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  Zap, 
  Store, 
  X,
  UserCheck,
  Building2
} from 'lucide-react-native';

const { height } = Dimensions.get('window');
const BRAND_LOGO = require('../../../assets/branding/overline-logo.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [role, setRole] = useState<'OWNER' | 'STAFF'>('OWNER');
  
  // Owner Fields
  const [ownerPhone, setOwnerPhone] = useState('');
  
  // Staff Fields
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [showShopPicker, setShowShopPicker] = useState(false);
  const [assignedShops, setAssignedShops] = useState<any[]>([]);
  const [staffAuthMode, setStaffAuthMode] = useState<'PIN' | 'OTP'>('PIN');

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isGoogleAuthEnabled = Boolean(
    Config.FEATURES?.GOOGLE_AUTH_ENABLED && Config.GOOGLE?.WEB_CLIENT_ID,
  );

  const { loginWithGoogle, sendPhoneLoginOtp, staffLogin, fetchAssignedStaffShops } = useAuthStore();

  useEffect(() => {
    if (!isGoogleAuthEnabled) {
      return;
    }

    GoogleSignin.configure({
      webClientId: Config.GOOGLE.WEB_CLIENT_ID,
      offlineAccess: Config.GOOGLE.OFFLINE_ACCESS,
    });
  }, [isGoogleAuthEnabled]);

  const handleOwnerPhoneLogin = async () => {
    const digits = ownerPhone.replace(/\D/g, '');
    if (digits.length < 10) return Alert.alert('Invalid Phone', 'Enter 10 digits');
    setIsLoading(true);
    try {
      const normalized = `+91${digits}`;
      await sendPhoneLoginOtp(normalized);
      navigation.navigate('OtpVerify', { phone: normalized, flow: 'PHONE_LOGIN', requestedRole: 'OWNER' });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!selectedShop) return Alert.alert('Missing Shop', 'Please select your shop first');
    if (staffPhone.replace(/\D/g, '').length < 10) return Alert.alert('Invalid Phone', 'Enter 10 digits');
    if (staffPin.length !== 6) return Alert.alert('Invalid PIN', 'Enter 6-digit employee code');
    
    setIsLoading(true);
    try {
      await staffLogin({
        shopId: selectedShop.id,
        phone: `+91${staffPhone.replace(/\D/g, '')}`,
        password: staffPin
      });
    } catch (e: any) {
      Alert.alert('Access Denied', e.response?.data?.message || 'Invalid Mobile or PIN for this shop.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindAssignedShops = async () => {
    const digits = staffPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('Invalid Phone', 'Enter 10 digits to find assigned shops');
      return;
    }

    setIsLoading(true);
    try {
      const shops = await fetchAssignedStaffShops(`+91${digits}`);
      setAssignedShops(shops);
      if (!shops.length) {
        Alert.alert('No Staff Assignment', 'No active staff assignments found for this mobile number.');
        return;
      }
      setShowShopPicker(true);
    } catch (e: any) {
      Alert.alert('Lookup Failed', e.response?.data?.message || 'Unable to fetch assigned shops');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffOtpLogin = async () => {
    if (!selectedShop) return Alert.alert('Missing Shop', 'Please select your shop first');
    const digits = staffPhone.replace(/\D/g, '');
    if (digits.length < 10) return Alert.alert('Invalid Phone', 'Enter 10 digits');

    setIsLoading(true);
    try {
      const normalized = `+91${digits}`;
      await sendPhoneLoginOtp(normalized, {
        requestedRole: 'STAFF',
        selectedShopId: selectedShop.id,
      });
      navigation.navigate('OtpVerify', {
        phone: normalized,
        flow: 'PHONE_LOGIN',
        requestedRole: 'STAFF',
        selectedShopId: selectedShop.id,
      });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isGoogleAuthEnabled) {
      Alert.alert(
        'Google Login Unavailable',
        'Google sign-in is not configured in this build. Use phone OTP login.',
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const googleUser = await GoogleSignin.signIn();
      const idToken = googleUser?.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      await loginWithGoogle(idToken, { requestedRole: 'OWNER' });
    } catch (e: any) {
      const errorCode = String(e?.code || '').toUpperCase();
      const errorMessage = String(e?.message || '');
      const isDeveloperError =
        errorCode.includes('DEVELOPER_ERROR') ||
        /developer[_\s-]?error/i.test(errorMessage) ||
        /\bcode\s*10\b/i.test(errorMessage);

      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Google Play Services Required',
          'Google Play Services is unavailable or outdated on this device. Please update it and try again.',
        );
        return;
      }

      if (isDeveloperError) {
        Alert.alert(
          'Google Login Misconfigured',
          'This APK signing certificate is not linked in Firebase Google Sign-In. Add Android OAuth SHA fingerprints for package com.appointmentbooking.app, then download and replace android/app/google-services.json and rebuild the APK.',
        );
        return;
      }

      Alert.alert('Google Error', e?.message || 'Unable to sign in with Google. Please use phone OTP login.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topCurtain} />
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Overline Business</Text>
            <Text style={styles.subtitle}>Enterprise Operations Cloud</Text>
          </View>

          <View style={styles.roleTabs}>
            <TouchableOpacity 
              style={[styles.roleTab, role === 'OWNER' && styles.roleTabActive]}
              onPress={() => setRole('OWNER')}
            >
              <Text style={[styles.roleTabText, role === 'OWNER' && styles.roleTabTextActive]}>OWNER</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleTab, role === 'STAFF' && styles.roleTabActive]}
              onPress={() => setRole('STAFF')}
            >
              <Text style={[styles.roleTabText, role === 'STAFF' && styles.roleTabTextActive]}>STAFF</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {role === 'OWNER' ? (
              <View>
                <Text style={styles.cardHeader}>Proprietor Console</Text>
                {isGoogleAuthEnabled ? (
                  <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={isGoogleLoading}>
                    {isGoogleLoading ? <ActivityIndicator color={Colors.primary} /> : (
                      <>
                        <View style={styles.googleBadge}>
                          <Text style={styles.googleBadgeText}>G</Text>
                        </View>
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.googleHint}>Google login is unavailable in this build. Use phone OTP.</Text>
                )}

                <View style={styles.dividerRow}>
                  <View style={styles.divider} /><Text style={styles.dividerText}>SECURE PHONE LOGIN</Text><View style={styles.divider} />
                </View>

                <View style={styles.inputBox}>
                  <Smartphone size={18} color="#94A3B8" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Mobile Number" 
                    keyboardType="phone-pad"
                    value={ownerPhone}
                    onChangeText={(t) => setOwnerPhone(t.replace(/[^\d+\s-]/g, ''))}
                  />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleOwnerPhoneLogin} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Text style={styles.primaryBtnText}>GET LOGIN CODE</Text>
                      <Zap size={16} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.cardHeader}>Team Member Portal</Text>
                
                <TouchableOpacity style={styles.shopTrigger} onPress={() => setShowShopPicker(true)}>
                  <View style={styles.shopTriggerMain}>
                    <Building2 size={18} color={selectedShop ? Colors.primary : "#94A3B8"} />
                    <Text style={[styles.shopTriggerText, selectedShop && { color: '#0F172A' }]}>
                      {selectedShop ? selectedShop.name : "Select your Shop"}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, {marginTop: 16}]}
                  onPress={handleFindAssignedShops}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>FIND MY SHOPS</Text>}
                </TouchableOpacity>

                <View style={[styles.inputBox, { marginTop: 16 }]}>
                  <Smartphone size={18} color="#94A3B8" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Registered Mobile" 
                    keyboardType="phone-pad"
                    value={staffPhone}
                    onChangeText={(t) => setStaffPhone(t.replace(/[^\d+\s-]/g, ''))}
                  />
                </View>

                <View style={styles.roleTabs}>
                  <TouchableOpacity
                    style={[styles.roleTab, staffAuthMode === 'PIN' && styles.roleTabActive]}
                    onPress={() => setStaffAuthMode('PIN')}
                  >
                    <Text style={[styles.roleTabText, staffAuthMode === 'PIN' && styles.roleTabTextActive]}>PIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleTab, staffAuthMode === 'OTP' && styles.roleTabActive]}
                    onPress={() => setStaffAuthMode('OTP')}
                  >
                    <Text style={[styles.roleTabText, staffAuthMode === 'OTP' && styles.roleTabTextActive]}>OTP</Text>
                  </TouchableOpacity>
                </View>

                {staffAuthMode === 'PIN' ? (
                  <>
                    <View style={[styles.inputBox, { marginTop: 8 }]}> 
                      <Lock size={18} color="#94A3B8" />
                      <TextInput 
                        style={styles.input} 
                        placeholder="6-Digit Employee PIN" 
                        keyboardType="number-pad"
                        maxLength={6}
                        secureTextEntry
                        value={staffPin}
                        onChangeText={(t) => setStaffPin(t.replace(/\D/g, '').slice(0, 6))}
                      />
                    </View>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleStaffLogin} disabled={isLoading}>
                      {isLoading ? <ActivityIndicator color="#FFF" /> : (
                        <>
                          <Text style={styles.primaryBtnText}>SIGN IN TO SHIFT</Text>
                          <UserCheck size={16} color="#FFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleStaffOtpLogin} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#FFF" /> : (
                      <>
                        <Text style={styles.primaryBtnText}>GET OTP CODE</Text>
                        <Zap size={16} color="#FFF" />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.footerWrap}>
              <ShieldCheck size={14} color={Colors.primary} />
              <Text style={styles.footerText}>Secure Business Session</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shop Picker Modal */}
      <Modal visible={showShopPicker} animationType="slide" transparent>
        <View style={styles.modal}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assigned Shop</Text>
              <TouchableOpacity onPress={() => setShowShopPicker(false)}><X size={24} color="#0F172A" /></TouchableOpacity>
            </View>
            <FlatList 
              data={assignedShops}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                   style={styles.shopItem} 
                   onPress={() => { setSelectedShop(item); setShowShopPicker(false); }}
                >
                  <View style={styles.shopIcon}><Store size={20} color={Colors.primary} /></View>
                  <View>
                    <Text style={styles.shopItemName}>{item.name}</Text>
                    <Text style={styles.shopItemLoc}>{item.address}</Text>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.modalEmpty}>
                  <Building2 size={48} color="#F1F5F9" />
                  <Text style={{ color: '#94A3B8', marginTop: 12, fontWeight: '600' }}>
                    No assigned shops found for this mobile number
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topCurtain: { position: 'absolute', top: 0, width: '100%', height: height * 0.3, backgroundColor: '#FFF', borderBottomLeftRadius: 60, borderBottomRightRadius: 60, ...Shadows.sm },
  scrollContent: { paddingHorizontal: 24, paddingTop: height * 0.06, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 24, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '700', marginTop: 4 },
  roleTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 6, marginBottom: 24 },
  roleTab: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  roleTabActive: { backgroundColor: '#FFF', ...Shadows.sm },
  roleTabText: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  roleTabTextActive: { color: Colors.primary },
  card: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.md },
  cardHeader: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 24, textAlign: 'center' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', gap: 12 },
  socialIcon: { width: 20, height: 20 },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: { fontSize: 12, fontWeight: '900', color: '#EA4335' },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  googleHint: { marginTop: 8, textAlign: 'center', fontSize: 12, color: '#64748B', fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  dividerText: { fontSize: 10, fontWeight: '900', color: '#CBD5E1', letterSpacing: 1 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: '#F1F5F9' },
  input: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  primaryBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 20, marginTop: 24, gap: 8, ...Shadows.glow },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  footerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  footerText: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  shopTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 20, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: '#F1F5F9' },
  shopTriggerMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shopTriggerText: { fontSize: 15, fontWeight: '700', color: '#94A3B8' },
  modal: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', margin: 20, paddingHorizontal: 16, height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  modalInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  shopItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, backgroundColor: '#F8FAFC' },
  shopIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary100, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  shopItemName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  shopItemLoc: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  modalEmpty: { marginTop: 60, alignItems: 'center' },
});
