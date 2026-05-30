import React, { useState, useRef, useMemo, Component, ErrorInfo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  FlatList,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shopsApi } from '../../api/client';
import { Shop } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Navigation, 
  Search, 
  Layers, 
  LocateFixed,
  ChevronRight
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_SPACING = 20;

const mapsModule = (() => {
  try {
    return require('react-native-maps');
  } catch {
    return null;
  }
})();

const MapView = mapsModule?.default;
const Marker = mapsModule?.Marker;
const UrlTile = mapsModule?.UrlTile;

class SafeMapViewContainer extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[SafeMapViewContainer] Map rendering crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function LocationMapScreen() {
  const navigation = useNavigation<any>();
  const [activeShopIndex, setActiveShopIndex] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [citySelectorVisible, setCitySelectorVisible] = useState(false);

  const mapRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: shopsData } = useQuery({
    queryKey: ['shopsMap'],
    queryFn: () => shopsApi.list().then(res => res.data),
  });

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    (shopsData?.data || []).forEach((shop: Shop) => {
      if (shop.city) cities.add(shop.city);
    });
    return ['All', ...Array.from(cities)];
  }, [shopsData]);

  const shops: Shop[] = useMemo(() => {
    const allShops = shopsData?.data || [];
    if (selectedCity === 'All') return allShops;
    return allShops.filter((s: Shop) => s.city === selectedCity);
  }, [shopsData, selectedCity]);

  React.useEffect(() => {
    async function requestPermission() {
      try {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        setHasLocationPermission(auth === 'granted');
      } catch (err) {
        console.warn('[LocationMapScreen] Geolocation permission query error:', err);
        setHasLocationPermission(false);
      }
    }
    requestPermission();
  }, []);

  React.useEffect(() => {
    if (shops.length > 0) {
      const firstShopWithCoords = shops.find(s => s.latitude != null && s.longitude != null);
      if (firstShopWithCoords && firstShopWithCoords.latitude && firstShopWithCoords.longitude) {
        const timer = setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: Number(firstShopWithCoords.latitude),
            longitude: Number(firstShopWithCoords.longitude),
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [shops]);

  const mapFallback = (
    <SafeAreaView style={styles.fallbackContainer}>
      <TouchableOpacity style={styles.fallbackBackBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={20} color="#0F172A" />
      </TouchableOpacity>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
        <MapPin size={48} color={Colors.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.fallbackTitle}>Map View is unavailable</Text>
        <Text style={styles.fallbackText}>
          We couldn't initialize the map engine. This might be because Google Play Services is missing or location services are disabled.
        </Text>
      </View>
    </SafeAreaView>
  );

  if (!MapView || !Marker) {
    return mapFallback;
  }

  const onMarkerPress = (index: number) => {
    setActiveShopIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    
    const shop = shops[index];
    if (shop.latitude && shop.longitude) {
      mapRef.current?.animateToRegion({
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const renderShopCard = ({ item, index }: { item: Shop; index: number }) => (
    <TouchableOpacity 
      style={[styles.card, activeShopIndex === index && styles.cardActive]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ShopDetail', { shopId: item.id })}
    >
      <Image 
        source={{ uri: item.coverUrl || item.coverPhotoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035' }} 
        style={styles.cardImage} 
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardRating}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '4.5'}</Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>{item.services?.[0]?.category || 'Salon'} • 0.8 km</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.priceTag}>from ₹499</Text>
          <View style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>View</Text>
            <ChevronRight size={14} color={Colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeMapViewContainer fallback={mapFallback}>
        <MapView
          provider={null}
          mapType="none"
          ref={mapRef}
          style={styles.map}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={hasLocationPermission}
          initialRegion={{
            latitude: 28.4595,
            longitude: 77.4938,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {UrlTile && (
            <UrlTile
              urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
            />
          )}
          {shops.map((shop, index) => {
            const lat = Number(shop.latitude);
            const lng = Number(shop.longitude);
            if (isNaN(lat) || isNaN(lng) || !shop.latitude || !shop.longitude) return null;
            return (
              <Marker
                key={shop.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => onMarkerPress(index)}
                tracksViewChanges={false}
              >
                <View style={[
                  styles.markerWrap, 
                  activeShopIndex === index && styles.markerWrapActive
                ]}>
                  <View style={styles.markerCircle}>
                    <MapPin size={18} color={activeShopIndex === index ? "#FFF" : Colors.primary} fill={activeShopIndex === index ? Colors.primary : "transparent"} />
                  </View>
                  {activeShopIndex === index && <View style={styles.markerArrow} />}
                </View>
              </Marker>
            );
          })}
        </MapView>
      </SafeMapViewContainer>

      {/* Floating Controls */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.searchBar} onPress={() => setCitySelectorVisible(true)}>
            <Search size={18} color="#94A3B8" />
            <Text style={styles.searchText}>{selectedCity === 'All' ? 'Search area...' : selectedCity}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn}>
            <Layers size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.sideControls}>
          <TouchableOpacity style={styles.sideBtn}>
            <LocateFixed size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn}>
            <Navigation size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Shop Carousel */}
        <View style={styles.bottomCarousel}>
          <FlatList
            ref={flatListRef}
            data={shops}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            renderItem={renderShopCard}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
              if (index !== activeShopIndex) {
                setActiveShopIndex(index);
                const shop = shops[index];
                if (shop?.latitude != null && shop?.longitude != null) {
                  mapRef.current?.animateToRegion({
                    latitude: Number(shop.latitude),
                    longitude: Number(shop.longitude),
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                  }, 500);
                }
              }
            }}
          />
        </View>
      </SafeAreaView>

      <Modal
        visible={citySelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCitySelectorVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCitySelectorVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select City</Text>
            <FlatList
              data={uniqueCities}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.cityOption, selectedCity === item && styles.cityOptionSelected]}
                  onPress={() => {
                    setSelectedCity(item);
                    setCitySelectorVisible(false);
                    setActiveShopIndex(0);
                  }}
                >
                  <Text style={[styles.cityOptionText, selectedCity === item && styles.cityOptionTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fallbackBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  fallbackTitle: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  fallbackText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '600',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topControls: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 10,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  searchBar: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    ...Shadows.md,
  },
  searchText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  sideControls: {
    position: 'absolute',
    right: 20,
    top: height * 0.35,
    gap: 12,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.md,
  },
  markerWrapActive: {
    transform: [{ scale: 1.2 }],
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    marginTop: -2,
  },
  bottomCarousel: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginRight: CARD_SPACING,
    flexDirection: 'row',
    padding: 12,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    flex: 1,
    marginRight: 4,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  cityOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cityOptionSelected: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
  },
  cityOptionText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'center',
  },
  cityOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
