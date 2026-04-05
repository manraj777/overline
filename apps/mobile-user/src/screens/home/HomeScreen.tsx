import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shopsApi } from '../../api/client';
import { Shop, RootStackParamList } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { Chip } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { Search, MapPin, Star, X, List, Map as MapIcon } from 'lucide-react-native';
import { PermissionManager } from '../../utils/PermissionManager';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = ['All', 'Salon', 'Spa', 'Clinic', 'Barber', 'Beauty'];
const DISTANCE_OPTIONS = [1, 5, 10, 25];
const RATING_OPTIONS = [4.8, 4.5, 4.0, 3.5];
const PRICE_OPTIONS = [
  { label: '₹', value: 500 },
  { label: '₹₹', value: 1500 },
  { label: '₹₹₹', value: 3000 },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [radiusKm, setRadiusKm] = useState(5);
  const [minRating, setMinRating] = useState(4.0);
  const [maxPrice, setMaxPrice] = useState(1500);
  const scrollY = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    PermissionManager.requestAllRequiredPermissions();
  }, []);

  const {
    data: shopsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['shops', searchQuery, activeCategory, radiusKm, minRating, maxPrice],
    queryFn: () =>
      shopsApi
        .list({
          search: searchQuery || undefined,
          radiusKm,
          minRating,
          maxPrice,
          type: mapCategoryToType(activeCategory),
        })
        .then(res => res.data),
  });

  const shops: Shop[] = React.useMemo(() => {
    const fetchedShops = (shopsData?.data || []) as Shop[];
    if (activeCategory === 'All') {
      return fetchedShops;
    }

    const category = activeCategory.toLowerCase();
    return fetchedShops.filter(shop => {
      const byName = shop.name.toLowerCase().includes(category);
      const byDescription = shop.description?.toLowerCase().includes(category);
      const byService = (shop.services || []).some(service =>
        service.name.toLowerCase().includes(category),
      );

      return byName || Boolean(byDescription) || byService;
    });
  }, [shopsData?.data, activeCategory]);

  const clearFilters = () => {
    setRadiusKm(5);
    setMinRating(4.0);
    setMaxPrice(1500);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const firstName = user?.name?.split(' ')[0] || 'there';

  const mapShops = shops.slice(0, 6);
  const mapHeight = 420;
  const mapWidth = width - Spacing.xl * 2;

  const markerPositions = React.useMemo(
    () => [
      { top: 0.18, left: 0.14 },
      { top: 0.28, left: 0.58 },
      { top: 0.42, left: 0.3 },
      { top: 0.55, left: 0.66 },
      { top: 0.62, left: 0.22 },
      { top: 0.72, left: 0.5 },
    ],
    [],
  );

  const renderShop = ({ item, index }: { item: Shop; index: number }) => (
    <TouchableOpacity
      style={[styles.shopCard, index === 0 && { marginTop: Spacing.sm }]}
      onPress={() => navigation.navigate('ShopDetail', { shopId: item.id })}
      activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.shopImageContainer}>
        {item.coverPhotoUrl ? (
          <Image
            source={{ uri: item.coverPhotoUrl }}
            style={styles.shopImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.shopImage, styles.placeholderImage]}>
            <Text style={styles.placeholderLetter}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {/* Overlay gradient */}
        <View style={styles.imageOverlay} />

        {/* Status badge */}
        <View style={styles.topRow}>
          {item.isOpen && (
            <View style={styles.openBadge}>
              <View style={styles.openDot} />
              <Text style={styles.openText}>Open Now</Text>
            </View>
          )}
        </View>

        {/* Rating on image */}
        <View style={styles.ratingOnImage}>
          <Star color={Colors.warning} size={14} fill={Colors.warning} />
          <Text style={styles.ratingValueText}>
            {item.rating?.toFixed(1) || 'New'}
          </Text>
        </View>
      </View>

      {/* Shop Info */}
      <View style={styles.shopInfo}>
        <Text style={styles.shopName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.locationRow}>
          <MapPin color={Colors.textSecondary} size={14} />
          <Text style={styles.shopAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>

        <View style={styles.shopMeta}>
          <View style={styles.metaLeft}>
            <Text style={styles.reviewCount}>
              {item.reviewCount || 0} reviews
            </Text>
          </View>

          {item.distance !== undefined && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                {item.distance < 1
                  ? `${(item.distance * 1000).toFixed(0)}m`
                  : `${item.distance.toFixed(1)}km`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {firstName}</Text>
              <Text style={styles.headerTitle}>Find your next{'\n'}experience</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIcon}>
              <Search color={Colors.textTertiary} size={18} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search salons, services..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <View style={styles.clearBtn}>
                  <X color={Colors.textSecondary} size={14} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <View style={styles.filterRow}>
            <FlatList
              data={CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <Chip
                  label={item}
                  selected={activeCategory === item}
                  onPress={() => setActiveCategory(item)}
                  style={{ marginRight: Spacing.sm }}
                />
              )}
            />
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <List color={viewMode === 'list' ? '#fff' : Colors.textSecondary} size={16} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('map')}
              >
                <MapIcon color={viewMode === 'map' ? '#fff' : Colors.textSecondary} size={16} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFiltersRow}
          >
            {DISTANCE_OPTIONS.map((distance) => (
              <Chip
                key={`distance-${distance}`}
                label={`${distance}km`}
                selected={radiusKm === distance}
                onPress={() => setRadiusKm(distance)}
                style={{ marginRight: Spacing.sm }}
              />
            ))}

            {RATING_OPTIONS.map((rating) => (
              <Chip
                key={`rating-${rating}`}
                label={`${rating}+`}
                selected={minRating === rating}
                onPress={() => setMinRating(rating)}
                style={{ marginRight: Spacing.sm }}
              />
            ))}

            {PRICE_OPTIONS.map((option) => (
              <Chip
                key={`price-${option.value}`}
                label={option.label}
                selected={maxPrice === option.value}
                onPress={() => setMaxPrice(option.value)}
                style={{ marginRight: Spacing.sm }}
              />
            ))}

            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersChip}>
              <Text style={styles.clearFiltersText}>Reset</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {viewMode === 'list' ? (
          <Animated.FlatList
            data={shops}
            keyExtractor={item => item.id}
            renderItem={renderShop}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primary}
                progressBackgroundColor={Colors.surface}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Search color={Colors.textTertiary} size={48} />
                  </View>
                  <Text style={styles.emptyTitle}>No salons found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'Try a different search term'
                      : 'No salons available in your area'}
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingState}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={styles.skeletonCard}>
                      <View style={styles.skeletonImage} />
                      <View style={styles.skeletonContent}>
                        <View style={[styles.skeletonLine, { width: '70%' }]} />
                        <View style={[styles.skeletonLine, { width: '50%' }]} />
                      </View>
                    </View>
                  ))}
                </View>
              )
            }
          />
        ) : (
          <View style={styles.mapModeContainer}>
            <View style={styles.mapCanvas}>
              {mapShops.map((shop, index) => {
                const marker = markerPositions[index % markerPositions.length];
                return (
                  <TouchableOpacity
                    key={shop.id}
                    style={[
                      styles.mapMarker,
                      {
                        top: marker.top * mapHeight,
                        left: marker.left * mapWidth,
                      },
                    ]}
                    onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}
                  >
                    <Text style={styles.mapMarkerText}>₹</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mapCardsRow}
            >
              {mapShops.map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={styles.mapShopCard}
                  onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}
                  activeOpacity={0.9}
                >
                  <Text style={styles.mapShopName} numberOfLines={1}>{shop.name}</Text>
                  <Text style={styles.mapShopAddress} numberOfLines={1}>{shop.address}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity
          style={styles.stickyToggle}
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          activeOpacity={0.9}
        >
          {viewMode === 'list' ? (
            <MapIcon color="#fff" size={16} />
          ) : (
            <List color="#fff" size={16} />
          )}
          <Text style={styles.stickyToggleText}>{viewMode === 'list' ? 'View Map' : 'View List'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FF',
  },
  header: {
    paddingBottom: Spacing.lg,
    backgroundColor: '#F3F6FF',
  },
  headerTop: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['2xl'],
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.glow,
  },
  greeting: {
    fontSize: FontSizes.md,
    color: '#E6EBFF',
    marginBottom: 4,
    fontWeight: FontWeights.medium,
  },
  headerTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
    color: '#FFFFFF',
    lineHeight: 38,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryList: {
    paddingLeft: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickFiltersRow: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  clearFiltersChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearFiltersText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xl,
    marginLeft: Spacing.sm,
    padding: 3,
  },
  viewToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  listContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  shopCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  shopImageContainer: {
    position: 'relative',
    height: 180,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLetter: {
    fontSize: 56,
    fontWeight: FontWeights.extrabold,
    color: Colors.primary,
    opacity: 0.3,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  topRow: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 196, 140, 0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  openText: {
    color: '#fff',
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  ratingOnImage: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  ratingStarText: {
    fontSize: 14,
    color: '#FFB830',
  },
  ratingValueText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  shopInfo: {
    padding: Spacing.lg,
  },
  shopName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  shopAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  shopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
  },
  distanceBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Loading skeletons
  loadingState: {
    paddingTop: Spacing.md,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skeletonImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surfaceLight,
  },
  skeletonContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 7,
  },
  mapModeContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  mapCanvas: {
    height: 420,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#DBEAFE',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  mapMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  mapMarkerText: {
    color: '#fff',
    fontWeight: FontWeights.bold,
    fontSize: 12,
  },
  mapCardsRow: {
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  mapShopCard: {
    width: width * 0.72,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  mapShopName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  mapShopAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  stickyToggle: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    ...Shadows.lg,
  },
  stickyToggleText: {
    color: '#fff',
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.sm,
  },
});

function mapCategoryToType(category: string): string | undefined {
  if (category === 'All') return undefined;

  const mapping: Record<string, string> = {
    Salon: 'SALON',
    Clinic: 'CLINIC',
    Spa: 'SPA',
  };

  return mapping[category];
}
