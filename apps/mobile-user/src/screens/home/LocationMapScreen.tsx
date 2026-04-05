import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_SPACING = 20;

export default function LocationMapScreen() {
  const navigation = useNavigation<any>();
  const [activeShopIndex, setActiveShopIndex] = useState(0);
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: shopsData } = useQuery({
    queryKey: ['shopsMap'],
    queryFn: () => shopsApi.list().then(res => res.data),
  });

  const shops = useMemo(() => shopsData?.data || [], [shopsData]);

  const onMarkerPress = (index: number) => {
    setActiveShopIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    
    const shop = shops[index];
    if (shop.latitude && shop.longitude) {
      mapRef.current?.animateToRegion({
        latitude: shop.latitude,
        longitude: shop.longitude,
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
        source={{ uri: item.coverPhotoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035' }} 
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
        <Text style={styles.cardSubtitle}>{item.type || 'Salon'} • 0.8 km</Text>
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
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 28.4595,
          longitude: 77.4938,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {shops.map((shop, index) => (
          shop.latitude && shop.longitude && (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
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
          )
        ))}
      </MapView>

      {/* Floating Controls */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <Text style={styles.searchText}>Search area...</Text>
          </View>

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
                if (shop?.latitude) {
                  mapRef.current?.animateCamera({
                    center: { latitude: shop.latitude, longitude: shop.longitude },
                    zoom: 16
                  });
                }
              }
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
