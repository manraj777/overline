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
} from 'react-native';
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
  ArrowRight
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
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    data: shopsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['shops', searchQuery, activeCategory],
    queryFn: () =>
      shopsApi
        .list({
          search: searchQuery || undefined,
          type: activeCategory === 'All' ? undefined : activeCategory.toUpperCase(),
        })
        .then(res => res.data),
  });

  const shops: Shop[] = useMemo(() => shopsData?.data || [], [shopsData]);

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

  const renderShop = ({ item }: { item: Shop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('ShopDetail', { shopId: item.id })}
      activeOpacity={0.9}>
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
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Sticky Premium Header */}
      <Animated.View style={[
        styles.header, 
        { 
          backgroundColor: headerBgColor, 
          paddingTop: insets.top + (Spacing.xs),
          shadowOpacity: headerShadow,
          elevation: headerShadow.interpolate({ inputRange: [0, 3], outputRange: [0, 8] })
        }
      ]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.locationContainer}>
            <View style={styles.locIconWrap}>
              <Locate size={18} color={Colors.primary} />
            </View>
            <View>
              <View style={styles.locLabelRow}>
                <Text style={styles.locLabel}>Current Location</Text>
                <ChevronDown size={14} color={Colors.textTertiary} />
              </View>
              <Text style={styles.locValue} numberOfLines={1}>Greater Noida, Uttar Pradesh</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={22} color={Colors.textPrimary} />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
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
        <Carousel data={PROMOTIONS} />

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
        <FlatList
          data={shops}
          renderItem={renderShop}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.shopList}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No experience found nearby</Text>
              </View>
            )
          }
        />

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
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
});
