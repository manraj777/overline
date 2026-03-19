import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { shopsApi } from '../../api/client';
import { Service, RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { Badge, PrimaryButton, Divider } from '../../components/ui';
import { ArrowLeft, Star, MapPin, Phone, Clock, Check, ArrowRight } from 'lucide-react-native';

type RouteProps = RouteProp<RootStackParamList, 'ShopDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ShopDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { shopId } = route.params;

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getBySlug(shopId).then(res => res.data),
    retry: 2,
  });

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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {shop.coverPhotoUrl ? (
            <Image
              source={{ uri: shop.coverPhotoUrl }}
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
            <ArrowLeft color={Colors.textPrimary} size={24} />
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
                text={shop.isOpen ? 'OPEN' : 'CLOSED'}
                color={shop.isOpen ? Colors.success : Colors.error}
                size="sm"
              />
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MapPin color={Colors.textSecondary} size={18} style={styles.infoIcon} />
            <Text style={styles.infoText}>{shop.address}</Text>
          </View>
          {shop.phone && (
            <View style={styles.infoRow}>
              <Phone color={Colors.textSecondary} size={18} style={styles.infoIcon} />
              <Text style={styles.infoText}>{shop.phone}</Text>
            </View>
          )}
          {shop.description && (
            <>
              <Divider />
              <Text style={styles.description}>{shop.description}</Text>
            </>
          )}
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Select Services</Text>
          <Text style={styles.sectionSubtitle}>
            Choose one or more services to book
          </Text>

          {(shop.services || []).map((service: Service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  isSelected && styles.serviceSelected,
                ]}
                onPress={() => toggleService(service.id)}
                activeOpacity={0.8}>
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
            title="Continue"
            onPress={() =>
              navigation.navigate('Booking', { shopId, selectedServices })
            }
            icon={<ArrowRight color="#fff" size={18} />}
            size="sm"
            style={{ paddingHorizontal: 28 }}
          />
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
});
