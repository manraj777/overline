import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  PermissionsAndroid,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from 'react-native-geolocation-service';
import { shopsApi, reviewsApi } from '../../api/client';
import { Service, RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { Badge, PrimaryButton, Divider } from '../../components/ui';
import { 
  ArrowLeft, Star, MapPin, Phone, Clock, Check, ArrowRight, Users, Zap, 
  MessageCircle, X, ChevronLeft, ChevronRight, Globe, ShieldCheck, Camera, Video, Mail, CreditCard 
} from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'ShopDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const mapsModule = (() => {
  try {
    return require('react-native-maps');
  } catch {
    return null;
  }
})();

function isShopOpenNow(workingHours: any[] | undefined): boolean {
  if (!workingHours || workingHours.length === 0) return false;

  const now = new Date();
  const dayOfWeekStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(now).toUpperCase();

  const workingHour = workingHours.find((wh: any) => wh.dayOfWeek === dayOfWeekStr);
  if (!workingHour || workingHour.isClosed) return false;

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const [currentH, currentM] = timeStr.split(':').map(Number);
  const currentMinutes = currentH * 60 + currentM;

  const [openH, openM] = workingHour.openTime.split(':').map(Number);
  const [closeH, closeM] = workingHour.closeTime.split(':').map(Number);
  
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export default function ShopDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId } = route.params;

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Book Service' | 'Team' | 'Reviews' | 'Media' | 'Info'>('Book Service');
  const tabs = ['Overview', 'Book Service', 'Team', 'Reviews', 'Media', 'Info'] as const;

  // Gallery light box
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // User location tracking
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
    retry: 2,
  });

  const { data: queueStats } = useQuery({
    queryKey: ['shopQueue', shop?.id],
    queryFn: () => shopsApi.getQueue(shop!.id).then(res => res.data),
    enabled: !!shop?.id,
    refetchInterval: 15000,
  });

  const { data: reviewsResponse } = useQuery({
    queryKey: ['shopReviews', shop?.id],
    queryFn: () => reviewsApi.getByShop(shop!.id, { limit: 15 }).then(res => res.data),
    enabled: !!shop?.id,
  });

  const reviews = reviewsResponse?.data || [];

  // Request location permission & track location
  useEffect(() => {
    let isMounted = true;
    async function checkPermissionAndLocate() {
      try {
        let hasPermission = false;
        if (Platform.OS === 'ios') {
          const auth = await Geolocation.requestAuthorization('whenInUse');
          hasPermission = auth === 'granted';
        } else if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Route Permission',
              message: 'Overline requires location access to show routes & directions.',
              buttonNeutral: 'Ask Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        }

        if (hasPermission && isMounted) {
          Geolocation.getCurrentPosition(
            (pos) => {
              if (isMounted) {
                setUserLocation({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
              }
            },
            (err) => console.log('[Geolocation] Error getting location:', err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        }
      } catch (err) {
        console.warn('[Geolocation] Request error:', err);
      }
    }
    checkPermissionAndLocate();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const selectedTotal = (shop?.services || [])
    .filter((s: Service) => selectedServices.includes(s.id))
    .reduce((sum: number, s: Service) => sum + Number(s.price), 0);

  const selectedDuration = (shop?.services || [])
    .filter((s: Service) => selectedServices.includes(s.id))
    .reduce((sum: number, s: Service) => sum + s.durationMinutes, 0);

  const isStaffAbsent = React.useCallback((person: any) => {
    if (!person) return false;
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
    }).format(now).toUpperCase();

    const wh = person.staffWorkingHours?.find((h: any) => String(h.dayOfWeek).toUpperCase() === todayStr);
    if (wh?.isOff) return true;

    if (person.staffTimeOffs?.length > 0) {
      return person.staffTimeOffs.some((to: any) => {
        const start = new Date(to.startTime);
        const end = new Date(to.endTime);
        return now >= start && now <= end;
      });
    }
    return false;
  }, []);

  const servicesByCategory = React.useMemo(() => {
    const grouped = new Map<string, Service[]>();
    const source = (shop?.services || []) as Service[];

    source.forEach((service) => {
      const category = (service.category || 'Popular').trim();
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(service);
    });

    return Array.from(grouped.entries()).map(([category, services]) => ({ category, services }));
  }, [shop?.services]);

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    (shop?.services || []).forEach((service: Service) => {
      if (service.category) {
        cats.add(service.category.trim());
      } else {
        cats.add('Popular');
      }
    });
    return Array.from(cats);
  }, [shop?.services]);

  const filteredServicesByCategory = React.useMemo(() => {
    if (selectedCategory === 'All') {
      return servicesByCategory;
    }
    return servicesByCategory.filter(group => group.category === selectedCategory);
  }, [servicesByCategory, selectedCategory]);

  const allPhotos = React.useMemo(() => {
    if (!shop) return [];
    const photos: string[] = [];
    if (shop.coverUrl || shop.coverPhotoUrl) {
      photos.push(shop.coverUrl || shop.coverPhotoUrl);
    }
    if (shop.photoUrls?.length) {
      photos.push(...shop.photoUrls);
    }
    return photos;
  }, [shop]);

  const isOpen = React.useMemo(() => isShopOpenNow(shop?.workingHours), [shop?.workingHours]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Shop not found</Text>
      </View>
    );
  }

  // Safe require Map components
  const MapView = mapsModule?.default;
  const Marker = mapsModule?.Marker;
  const PROVIDER_GOOGLE = mapsModule?.PROVIDER_GOOGLE;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {allPhotos.length > 0 ? (
            <Image
              source={{ uri: allPhotos[0] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.placeholderHero]}>
              <Text style={styles.placeholderLetter}>
                {shop.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.heroOverlay} />

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>

          {/* Shop name on overlay */}
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{shop.name}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroBadge}>
                <Star color={Colors.warning} size={14} fill={Colors.warning} />
                <Text style={styles.heroRating}>
                  {shop.rating?.toFixed(1) || 'New'}
                </Text>
              </View>
              <Text style={styles.heroReviews}>
                {shop.reviewCount || 0} reviews
              </Text>
              <Badge
                text={isOpen ? 'OPEN' : 'CLOSED'}
                color={isOpen ? Colors.success : Colors.error}
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Tab Selection Row */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {tabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabItem, active && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
                  {active && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Dynamic Tab Content */}
        <View style={styles.tabContentContainer}>
          
          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <View style={styles.tabBody}>
              <Text style={styles.cardHeaderTitle}>About the Shop</Text>
              <Text style={styles.description}>
                {shop.description || 'Welcome to our premium scheduling services page. Feel free to browse our team, services list, or get driving coordinates.'}
              </Text>
              
              <View style={styles.overviewQuickBox}>
                <View style={styles.overviewItem}>
                  <Clock color={Colors.primary} size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overviewItemLabel}>Today's Working Hours</Text>
                    <Text style={styles.overviewItemValue}>
                      {isOpen ? 'Open Now' : 'Closed'} • India Standard Time
                    </Text>
                  </View>
                </View>
                <View style={styles.overviewItem}>
                  <MapPin color={Colors.primary} size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overviewItemLabel}>Shop Location Address</Text>
                    <Text style={styles.overviewItemValue}>{shop.address}</Text>
                  </View>
                </View>
              </View>

              {/* Mini Map Preview */}
              {shop.latitude && shop.longitude && MapView && Marker && (
                <View style={styles.overviewMapBlock}>
                  <Text style={styles.cardHeaderTitle}>Interactive Map Locator</Text>
                  <View style={styles.miniMapWrap}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={StyleSheet.absoluteFillObject}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      initialRegion={{
                        latitude: shop.latitude,
                        longitude: shop.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }}
                    >
                      {/* Shop pin */}
                      <Marker coordinate={{ latitude: shop.latitude, longitude: shop.longitude }} title={shop.name} />
                      
                      {/* User Location pin */}
                      {userLocation && (
                        <Marker 
                          coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} 
                          title="Your Location"
                          pinColor="#3B82F6"
                        />
                      )}
                    </MapView>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.directionsButton}
                    onPress={() => {
                      const origin = userLocation ? `&origin=${userLocation.latitude},${userLocation.longitude}` : '';
                      const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${shop.latitude},${shop.longitude}&travelmode=driving`;
                      Linking.openURL(url);
                    }}
                  >
                    <MapPin size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.directionsButtonText}>GET DRIVING DIRECTIONS</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Book Service Tab */}
          {activeTab === 'Book Service' && (
            <View style={styles.tabBody}>
              {/* Queue status banner */}
              <View style={styles.queueNotice}>
                {queueStats ? (
                  <View>
                    <View style={styles.queueLiveHeader}>
                      <View style={styles.livePulseContainer}>
                        <View style={styles.livePulseRing} />
                        <View style={styles.livePulseDot} />
                      </View>
                      <Text style={styles.queueLiveTitle}>LIVE QUEUE STATUS</Text>
                    </View>
                    {queueStats.waitingCount === 0 ? (
                      <View style={styles.queueRow}>
                        <Zap color={Colors.success} size={18} fill={Colors.success} style={{ marginRight: 8 }} />
                        <Text style={[styles.queueText, { color: Colors.success, fontWeight: '700' }]}>
                          Available Now (No Wait)
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.queueStatsInline}>
                        <View style={styles.queueStatItem}>
                          <Users color={Colors.primary} size={18} style={{ marginRight: 6 }} />
                          <Text style={styles.queueText}>
                            <Text style={styles.queueHighlight}>{queueStats.waitingCount}</Text> in line
                          </Text>
                        </View>
                        <View style={styles.queueStatDivider} />
                        <View style={styles.queueStatItem}>
                          <Clock color={Colors.warning} size={18} style={{ marginRight: 6 }} />
                          <Text style={styles.queueText}>
                            ~<Text style={styles.queueHighlight}>{queueStats.estimatedWaitMinutes}</Text> min wait
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.queueNoticeTitle}>Walk-in queue available</Text>
                    <Text style={styles.queueNoticeText}>Book now to get priority at your slot time.</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardHeaderTitle}>Available Services</Text>
              <Text style={styles.sectionSubtitle}>Select services to schedule appointment slot</Text>

              {/* Category Pill Tab Bar */}
              <View style={styles.categoriesContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesList}
                >
                  {categories.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryPill,
                          isActive && styles.categoryPillActive,
                        ]}
                        onPress={() => setSelectedCategory(category)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            isActive && styles.categoryPillTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Services cards list */}
              {filteredServicesByCategory.map((group) => (
                <View key={group.category} style={{ marginBottom: Spacing.lg }}>
                  <Text style={styles.categoryTitle}>{group.category}</Text>
                  {group.services.map((service: Service) => {
                    const isSelected = selectedServices.includes(service.id);
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceCard,
                          isSelected && styles.serviceSelected,
                        ]}
                        onPress={() => toggleService(service.id)}
                        activeOpacity={0.8}
                      >
                        {/* Service Photo preview if present */}
                        {(service as any).imageUrl && (
                          <Image source={{ uri: (service as any).imageUrl }} style={styles.serviceCoverPhoto} />
                        )}
                        
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{service.name}</Text>
                          {service.description && (
                            <Text style={styles.serviceDesc} numberOfLines={2}>
                              {service.description}
                            </Text>
                          )}
                          <View style={styles.serviceMetaRow}>
                            <Clock color={Colors.textSecondary} size={14} style={{ marginRight: 4 }} />
                            <Text style={styles.serviceDuration}>
                              {service.durationMinutes} min
                            </Text>
                          </View>
                        </View>
                        <View style={styles.servicePriceCol}>
                          <Text style={[styles.servicePrice, isSelected && styles.servicePriceSelected]}>
                            ₹{service.price}
                          </Text>
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxChecked,
                            ]}>
                            {isSelected && (
                              <Check color="#fff" size={14} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Team Experts Tab */}
          {activeTab === 'Team' && (
            <View style={styles.tabBody}>
              <Text style={styles.cardHeaderTitle}>Our Specialists</Text>
              <Text style={styles.sectionSubtitle}>Choose your professional team members</Text>
              
              {shop.staff && shop.staff.length > 0 ? (
                shop.staff.map((person: any) => {
                  const isAbsent = isStaffAbsent(person);
                  return (
                    <View key={person.id} style={[styles.staffCard, isAbsent && { opacity: 0.6 }]}>
                      <View style={styles.staffHeader}>
                        <View style={styles.staffAvatarWrap}>
                          {person.avatarUrl ? (
                            <Image source={{ uri: person.avatarUrl }} style={styles.staffAvatar} />
                          ) : (
                            <View style={styles.staffAvatarPlaceholder}>
                              <Text style={styles.avatarLetter}>{person.name?.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.staffName}>{person.name}</Text>
                            {isAbsent && (
                              <View style={styles.absentBadge}>
                                <Text style={styles.absentBadgeText}>ABSENT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.staffRole}>{person.role || 'Grooming Professional'}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No specialists registered for this shop.</Text>
              )}
            </View>
          )}

          {/* Reviews Tab */}
          {activeTab === 'Reviews' && (
            <View style={styles.tabBody}>
              <Text style={styles.cardHeaderTitle}>Customer Testimonials</Text>
              <Text style={styles.sectionSubtitle}>Verified ratings from active store visits</Text>
              
              {reviews.length > 0 ? (
                reviews.map((rev: any) => (
                  <View key={rev.id} style={styles.reviewCardFull}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {rev.user?.name?.charAt(0) || 'G'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewUser}>{rev.user?.name || 'Verified Client'}</Text>
                        <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              color={s <= rev.rating ? '#F59E0B' : '#E2E8F0'}
                              fill={s <= rev.rating ? '#F59E0B' : 'transparent'}
                            />
                          ))}
                        </View>
                      </View>
                      <Badge text="VERIFIED" color={Colors.success} size="sm" />
                    </View>
                    <Text style={styles.reviewCommentFull}>
                      {rev.comment || 'Excellent services and staff! Had a very comfortable experience.'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No customer reviews written yet.</Text>
              )}
            </View>
          )}

          {/* Media/Gallery Tab */}
          {activeTab === 'Media' && (
            <View style={styles.tabBody}>
              <Text style={styles.cardHeaderTitle}>Shop Photo Gallery</Text>
              <Text style={styles.sectionSubtitle}>Visual tour of the shop layout and environment</Text>
              
              <View style={styles.mediaGrid}>
                {allPhotos.map((photo, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.mediaGridItem}
                    onPress={() => {
                      setGalleryIndex(i);
                      setGalleryOpen(true);
                    }}
                  >
                    <Image source={{ uri: photo }} style={styles.mediaThumbnail} />
                  </TouchableOpacity>
                ))}
                {allPhotos.length === 0 && (
                  <Text style={styles.emptyText}>No photos uploaded yet.</Text>
                )}
              </View>
            </View>
          )}

          {/* Info Tab */}
          {activeTab === 'Info' && (
            <View style={styles.tabBody}>
              <Text style={styles.cardHeaderTitle}>Contact details</Text>
              <View style={styles.infoDetailsBox}>
                <TouchableOpacity
                  style={styles.infoDetailRow}
                  onPress={() => Linking.openURL(`tel:${shop.phone}`)}
                >
                  <Phone size={18} color={Colors.primary} />
                  <Text style={styles.infoDetailText}>Phone: {shop.phone || 'Not available'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.infoDetailRow}
                  onPress={() => {
                    if (shop.phone) {
                      const clean = shop.phone.replace(/\D/g, '');
                      const wa = clean.length === 10 ? `91${clean}` : clean;
                      Linking.openURL(`https://wa.me/${wa}`);
                    }
                  }}
                >
                  <MessageCircle size={18} color="#25D366" />
                  <Text style={[styles.infoDetailText, { color: '#25D366' }]}>WhatsApp Onboarding</Text>
                </TouchableOpacity>
                <View style={styles.infoDetailRow}>
                  <Mail size={18} color={Colors.primary} />
                  <Text style={styles.infoDetailText}>Email: {shop.email || 'Not available'}</Text>
                </View>
                <View style={styles.infoDetailRow}>
                  <CreditCard size={18} color={Colors.primary} />
                  <Text style={styles.infoDetailText}>Accepted Payments: Cash, Cards, UPI (Prepaid & Postpaid)</Text>
                </View>
              </View>

              <Text style={[styles.cardHeaderTitle, { marginTop: 24 }]}>Weekly Schedule</Text>
              <View style={styles.weeklyScheduleTable}>
                {shop.workingHours?.map((wh: any) => (
                  <View key={wh.id} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{wh.dayOfWeek}</Text>
                    <Text style={styles.scheduleHours}>
                      {wh.isClosed ? 'CLOSED' : `${wh.openTime} - ${wh.closeTime}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Bottom Bar */}
      {selectedServices.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomCount}>
              {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.bottomAmount}>
              ₹{selectedTotal} · {selectedDuration} min
            </Text>
          </View>
          <PrimaryButton
            title={`Add ${selectedServices.length} item${selectedServices.length > 1 ? 's' : ''} to cart`}
            onPress={() =>
              navigation.navigate('BookingStaff', { shopId, selectedServices })
            }
            icon={<ArrowRight color="#fff" size={18} />}
            size="sm"
            style={{ paddingHorizontal: 28 }}
          />
        </View>
      )}

      {/* Photo Lightbox Modal */}
      <Modal visible={galleryOpen} transparent animationType="fade">
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setGalleryOpen(false)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.lightboxInner}>
            <TouchableOpacity
              style={styles.lightboxArrow}
              onPress={() => setGalleryIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1))}
            >
              <ChevronLeft size={32} color="#FFF" />
            </TouchableOpacity>
            
            {allPhotos.length > 0 && (
              <Image source={{ uri: allPhotos[galleryIndex] }} style={styles.lightboxImage} resizeMode="contain" />
            )}

            <TouchableOpacity
              style={styles.lightboxArrow}
              onPress={() => setGalleryIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0))}
            >
              <ChevronRight size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.lightboxIndicator}>{galleryIndex + 1} / {allPhotos.length}</Text>
        </View>
      </Modal>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  // Hero
  heroContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderHero: {
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLetter: {
    fontSize: 80,
    fontWeight: FontWeights.extrabold,
    color: Colors.primary,
    opacity: 0.2,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backArrow: {
    fontSize: 20,
    color: '#fff',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  heroName: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
    color: '#fff',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroStar: {
    fontSize: 16,
    color: '#FFB830',
  },
  heroRating: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  heroReviews: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  // Info section
  infoSection: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  queueNotice: {
    backgroundColor: Colors.primaryGhost,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  queueNoticeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: 2,
  },
  queueNoticeText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: Spacing.md,
    width: 24,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Services
  servicesSection: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xl,
  },
  categoryTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  serviceSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  serviceInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  serviceName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginBottom: 6,
    lineHeight: 18,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDuration: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  servicePriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  servicePrice: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  servicePriceSelected: {
    color: Colors.primary,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontWeight: FontWeights.bold,
    fontSize: 14,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: 36,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.md,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  bottomAmount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  categoriesContainer: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoriesList: {
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.glow,
  },
  categoryPillText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#fff',
    fontWeight: FontWeights.bold,
  },
  queueLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  livePulseContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  livePulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    opacity: 0.4,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  queueLiveTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.extrabold,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueStatsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  queueStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
  },
  queueText: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  queueHighlight: {
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  reviewsSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  reviewsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.xl,
  },
  reviewCard: {
    width: 240,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  reviewUser: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  reviewComment: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  tabBar: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
    paddingVertical: 4,
  },
  tabScroll: {
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    position: 'relative',
    alignItems: 'center',
  },
  tabItemActive: {},
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '900',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBody: {
    padding: 20,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  overviewQuickBox: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    gap: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewItemLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  overviewItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  overviewMapBlock: {
    marginTop: 24,
  },
  miniMapWrap: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#EEF2FF',
  },
  directionsButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  directionsButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  serviceCoverPhoto: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
  },
  staffCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  staffAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
  },
  staffAvatar: {
    width: '100%',
    height: '100%',
  },
  staffAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  staffRole: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  absentBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  absentBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EF4444',
  },
  reviewCardFull: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewCommentFull: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaGridItem: {
    width: (Dimensions.get('window').width - 50) / 2,
    aspectRatio: 1.2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontWeight: '600',
    paddingVertical: 24,
    fontSize: 14,
  },
  infoDetailsBox: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoDetailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    flex: 1,
  },
  weeklyScheduleTable: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  scheduleDay: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  scheduleHours: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  lightboxArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    flex: 1,
    height: '80%',
    aspectRatio: 1,
  },
  lightboxIndicator: {
    position: 'absolute',
    bottom: 40,
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
  },
});
