import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Modal,
  Alert,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shopsApi } from '../../api/client';
import { Shop, RootStackParamList } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import { 
  Search, 
  MapPin, 
  Star, 
  X, 
  ChevronDown, 
  Bell, 
  Locate, 
  ShieldCheck, 
  Zap,
  Map as MapIcon,
  Navigation,
  ArrowRight,
  User,
} from 'lucide-react-native';
import { Carousel, CarouselItem } from '../../components/Carousel';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { name: 'All', icon: '✨' },
  { name: 'Salon', icon: '✂️' },
  { name: 'Spa', icon: '💆' },
  { name: 'Clinic', icon: '🏥' },
  { name: 'Barber', icon: '🧔' },
  { name: 'Beauty', icon: '💅' }
];

const PROMOTIONS: CarouselItem[] = [
  {
    id: '1',
    title: 'Luxury Salon',
    subtitle: 'Flat 20% off on your first visit',
    tag: 'LIMITED OFFER',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    title: 'Elite Wellness',
    subtitle: 'Premium dental care starting at ₹49',
    tag: 'NEW DEAL',
    imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '3',
    title: 'Zen Spa & Retreat',
    subtitle: 'Free shoulder massage with any facial',
    tag: 'FEATURED',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ae6ce6db87e?auto=format&fit=crop&q=80&w=800',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [locationName, setLocationName] = useState('Greater Noida, Uttar Pradesh');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Location selector states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function requestLocation() {
      try {
        let hasPermission = false;
        if (Platform.OS === 'ios') {
          const auth = await Geolocation.requestAuthorization('whenInUse');
          hasPermission = auth === 'granted';
        } else if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Overline requires access to your location to find nearby shops.',
              buttonNeutral: 'Ask Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (hasPermission && isMounted) {
          Geolocation.getCurrentPosition(
            async (pos) => {
              if (!isMounted) return;
              const { latitude, longitude } = pos.coords;
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                  {
                    headers: {
                      'User-Agent': 'OverlineApp/1.0',
                    },
                  }
                );
                const data = await response.json();
                if (data && data.address && isMounted) {
                  const city = data.address.city || data.address.town || data.address.suburb || data.address.county || '';
                  const state = data.address.state || '';
                  const displayLoc = city && state ? `${city}, ${state}` : (data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                  setLocationName(displayLoc);
                }
              } catch (geocodeErr) {
                console.log('[Geolocation] Geocode error:', geocodeErr);
                if (isMounted) {
                  setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
              }
            },
            (err) => console.log('[Geolocation] Error getting position:', err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        }
      } catch (err) {
        console.warn('[Geolocation] Request error:', err);
      }
    }
    requestLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const {
    data: shopsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['shops', searchQuery, activeCategory, selectedLat, selectedLng, selectedCity],
    queryFn: () =>
      shopsApi
        .list({
          search: searchQuery || undefined,
          type: activeCategory === 'All' ? undefined : activeCategory.toUpperCase(),
          latitude: selectedLat || undefined,
          longitude: selectedLng || undefined,
          city: selectedCity || undefined,
        })
        .then(res => res.data),
  });

  const shops: Shop[] = useMemo(() => shopsData?.data || [], [shopsData]);

  const promotionsData = useMemo(() => {
    if (shops && shops.length > 0) {
      return shops.slice(0, 3).map((shop, index) => ({
        id: shop.id,
        title: shop.name,
        subtitle: shop.address || 'Premium salon & spa experience nearby',
        tag: index === 0 ? 'FEATURED' : (index === 1 ? 'RECOMMENDED' : 'POPULAR'),
        imageUrl: shop.coverUrl || shop.coverPhotoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
        onPress: () => navigation.navigate('ShopDetail', { shopId: shop.id }),
      }));
    }
    return PROMOTIONS.map(p => ({
      ...p,
      onPress: () => {}
    }));
  }, [shops, navigation]);

  const headerBgColor = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'],
    extrapolate: 'clamp',
  });

  const headerShadow = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 3],
    extrapolate: 'clamp',
  });

  const getShopCategory = (shop: Shop) =>
    shop.services?.[0]?.category || activeCategory || 'Salon';

  // Animated shop card with scale press effect and fade-in entrance
  const AnimatedShopCard = React.useCallback(({ item, index }: { item: Shop; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 80,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: index * 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const onPressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        friction: 8,
        useNativeDriver: true,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}>
        <TouchableOpacity
          style={styles.shopCard}
          onPress={() => navigation.navigate('ShopDetail', { shopId: item.id })}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}>
          <View style={styles.shopImageContainer}>
            {item.coverUrl || item.coverPhotoUrl ? (
              <Image source={{ uri: item.coverUrl || item.coverPhotoUrl }} style={styles.shopImage} />
            ) : (
              <View style={[styles.shopImage, styles.placeholderImage]}>
                <Text style={styles.placeholderLetter}>{item.name.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Star color="#FFD700" fill="#FFD700" size={12} />
              <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '4.5'}</Text>
            </View>
            
            {item.isOpen && (
              <View style={styles.liveBadge}>
                <Zap size={10} color="#FFF" fill="#FFF" />
                <Text style={styles.liveText}>OPEN</Text>
              </View>
            )}
          </View>

          <View style={styles.shopInfo}>
            <View style={styles.shopHeaderRow}>
              <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
              <ShieldCheck size={16} color={Colors.primary} />
            </View>
            
            <Text style={styles.shopCategory}>{getShopCategory(item)}</Text>
            
            <View style={styles.shopFooter}>
              <View style={styles.locationRow}>
                <MapPin size={12} color={Colors.textTertiary} />
                <Text style={styles.distanceText}>{item.distance ? `${item.distance.toFixed(1)} km` : 'Near you'}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceSymbol}>₹₹</Text>
                <Text style={styles.priceText}>Mid Range</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [navigation, activeCategory]);

  // Skeleton shimmer loading placeholder
  const ShopCardSkeleton = () => {
    const shimmer = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }, []);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
    return (
      <View style={styles.shopCard}>
        <Animated.View style={[styles.shopImage, { backgroundColor: '#E2E8F0', opacity }]} />
        <View style={styles.shopInfo}>
          <Animated.View style={{ height: 16, width: '70%', backgroundColor: '#E2E8F0', borderRadius: 8, opacity, marginBottom: 8 }} />
          <Animated.View style={{ height: 12, width: '40%', backgroundColor: '#E2E8F0', borderRadius: 6, opacity, marginBottom: 12 }} />
          <Animated.View style={{ height: 12, width: '55%', backgroundColor: '#E2E8F0', borderRadius: 6, opacity }} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Sticky Premium Header */}
      <Animated.View 
        pointerEvents="box-none"
        style={[
          styles.header, 
          { 
            backgroundColor: headerBgColor, 
            paddingTop: insets.top + (Spacing.xs),
            shadowOpacity: headerShadow,
            elevation: headerShadow.interpolate({ inputRange: [0, 3], outputRange: [0, 8] })
          }
        ]}
      >
        <View style={styles.headerContent} pointerEvents="box-none">
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={() => setShowLocationModal(true)}
          >
            <View style={styles.locIconWrap}>
              <Locate size={18} color={Colors.primary} />
            </View>
            <View>
              <View style={styles.locLabelRow}>
                <Text style={styles.locLabel}>Current Location</Text>
                <ChevronDown size={14} color={Colors.textTertiary} />
              </View>
              <Text style={styles.locValue} numberOfLines={1}>{locationName}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications' as any)}>
              <Bell size={22} color={Colors.textPrimary} />
              <View style={styles.bellBadge} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Profile' as any)}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={18} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={{ height: insets.top + 70 }} />
        
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textTertiary} />
            <TextInput
              placeholder="Search for salons, spas..."
              placeholderTextColor={Colors.textTertiary}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Navigation size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              onPress={() => setActiveCategory(cat.name)}
              style={[
                styles.catItem,
                activeCategory === cat.name && styles.catItemActive
              ]}
            >
              <View style={[
                styles.catIconWrap,
                activeCategory === cat.name && styles.catIconWrapActive
              ]}>
                <Text style={styles.catEmoji}>{cat.icon}</Text>
              </View>
              <Text style={[
                styles.catName,
                activeCategory === cat.name && styles.catNameActive
              ]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Promotions */}
        <Carousel data={promotionsData} />

        {/* Why Overline Section (User Benefits for Indian Market) */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsSectionTitle}>Why Book on Overline? ⚡</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.benefitsScroll}
          >
            <View style={[styles.benefitCard, { backgroundColor: '#EEF2F6' }]}>
              <Text style={styles.benefitIcon}>⏱️</Text>
              <Text style={styles.benefitTitle}>Zero Waiting</Text>
              <Text style={styles.benefitDesc}>Arrive exactly when it's your turn. Save 30-45 minutes on every visit.</Text>
            </View>
            
            <View style={[styles.benefitCard, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.benefitIcon}>💰</Text>
              <Text style={styles.benefitTitle}>Direct Pricing</Text>
              <Text style={styles.benefitDesc}>Zero platform charges. Pay the absolute lowest price directly to the shop.</Text>
            </View>

            <View style={[styles.benefitCard, { backgroundColor: '#FDF2F8' }]}>
              <Text style={styles.benefitIcon}>📲</Text>
              <Text style={styles.benefitTitle}>Live Tracking</Text>
              <Text style={styles.benefitDesc}>Real-time token positions, estimated wait times, and WhatsApp sound alerts.</Text>
            </View>

            <View style={[styles.benefitCard, { backgroundColor: '#FFFBEB' }]}>
              <Text style={styles.benefitIcon}>🛡️</Text>
              <Text style={styles.benefitTitle}>100% Verified</Text>
              <Text style={styles.benefitDesc}>Browse genuine Google Reviews. No fake listings or bots.</Text>
            </View>

            <View style={[styles.benefitCard, { backgroundColor: '#F0F9FF' }]}>
              <Text style={styles.benefitIcon}>📄</Text>
              <Text style={styles.benefitTitle}>Digital Rx Sync</Text>
              <Text style={styles.benefitDesc}>Get clinic prescriptions, recommended tests, and follow-ups synced to your app.</Text>
            </View>
          </ScrollView>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Featured Spaces</Text>
            <Text style={styles.sectionSubtitle}>Handpicked premium experiences</Text>
          </View>
          <TouchableOpacity style={styles.seeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <ArrowRight size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Shop List */}
        <View style={styles.shopList}>
          {shops.length > 0 ? (
            shops.map((shop, index) => (
              <AnimatedShopCard key={shop.id} item={shop} index={index} />
            ))
          ) : isLoading ? (
            <>
              <ShopCardSkeleton />
              <ShopCardSkeleton />
              <ShopCardSkeleton />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No experience found nearby</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Map Toggle */}
      <TouchableOpacity 
        style={styles.mapToggle}
        onPress={() => navigation.navigate('LocationMap')}
      >
        <MapIcon size={20} color="#FFF" />
        <Text style={styles.mapToggleText}>View Map</Text>
      </TouchableOpacity>

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
                  Geolocation.getCurrentPosition(
                    async (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setSelectedLat(latitude);
                      setSelectedLng(longitude);
                      setSelectedCity(null);
                      try {
                        const response = await fetch(
                          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                          { headers: { 'User-Agent': 'OverlineApp/1.0' } }
                        );
                        const data = await response.json();
                        if (data && data.address) {
                          const city = data.address.city || data.address.town || data.address.suburb || '';
                          const state = data.address.state || '';
                          setLocationName(city ? `${city}, ${state}` : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                        }
                      } catch {
                        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                      }
                    },
                    (err) => Alert.alert('Error', 'Unable to fetch GPS: ' + err.message),
                    { enableHighAccuracy: true, timeout: 15000 }
                  );
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
                    const query = customAddress.trim();
                    setLocationName(query);
                    const coordsMatch = query.match(/^([-+]?\d{1,2}\.\d+),\s*([-+]?\d{1,3}\.\d+)$/);
                    if (coordsMatch) {
                      const lat = parseFloat(coordsMatch[1]);
                      const lng = parseFloat(coordsMatch[2]);
                      setSelectedLat(lat);
                      setSelectedLng(lng);
                      setSelectedCity(null);
                    } else {
                      setSelectedCity(query);
                      setSelectedLat(null);
                      setSelectedLng(null);
                    }
                  }}
                >
                  <Text style={styles.modalApplyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {/* Popular Indian Cities */}
              <Text style={styles.modalSubtitle}>POPULAR CITIES (TEST DEMO)</Text>
              <View style={styles.citiesGrid}>
                {[
                  { name: 'Vidisha', lat: 23.5251, lng: 77.8081 },
                  { name: 'Noida', lat: 28.5355, lng: 77.3910 },
                  { name: 'Greater Noida', lat: 28.4595, lng: 77.4938 },
                  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
                  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
                  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
                  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
                ].map((city) => (
                  <TouchableOpacity
                    key={city.name}
                    style={styles.cityChip}
                    onPress={() => {
                      setShowLocationModal(false);
                      setLocationName(city.name);
                      setSelectedCity(city.name);
                      setSelectedLat(city.lat);
                      setSelectedLng(city.lng);
                    }}
                  >
                    <MapPin size={12} color={Colors.textSecondary} />
                    <Text style={styles.cityChipText}>{city.name}</Text>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: -2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  bellBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    height: 56,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingLeft: Spacing.xl,
    paddingVertical: 24,
    gap: 16,
  },
  catItem: {
    alignItems: 'center',
    gap: 8,
  },
  catItemActive: {
    transform: [{ scale: 1.03 }],
  },
  catIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catIconWrapActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catEmoji: {
    fontSize: 24,
  },
  catName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  catNameActive: {
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '600',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  shopList: {
    paddingHorizontal: Spacing.xl,
    gap: 20,
  },
  shopCard: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  shopImageContainer: {
    height: 200,
    position: 'relative',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLetter: {
    fontSize: 48,
    fontWeight: '900',
    color: '#E5E7EB',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shopInfo: {
    padding: 16,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  shopCategory: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '600',
    marginTop: 2,
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceSymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  priceText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  mapToggle: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    gap: 10,
    ...Shadows.lg,
  },
  mapToggleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  benefitsSection: {
    paddingVertical: Spacing.md,
  },
  benefitsSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  benefitsScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  benefitCard: {
    width: 170,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  benefitIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  benefitTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#1E293B',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    borderRadius: BorderRadius.full,
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
