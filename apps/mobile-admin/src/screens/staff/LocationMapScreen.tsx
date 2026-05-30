import React, {useCallback, useEffect, useMemo, useRef, Component, ErrorInfo} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {queueApi, shopApi} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {TrackableBooking} from '../../types';

const mapsModule = (() => {
  try {
    return require('react-native-maps');
  } catch {
    return null;
  }
})();

const MapView = mapsModule?.default;
const Marker = mapsModule?.Marker;
const PROVIDER_GOOGLE = mapsModule?.PROVIDER_GOOGLE;

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

function etaColor(startTime?: string) {
  if (!startTime) return '#64748B';
  const etaMs = new Date(startTime).getTime() - Date.now();
  if (etaMs <= 10 * 60 * 1000) return '#16A34A';
  if (etaMs <= 20 * 60 * 1000) return '#F59E0B';
  return '#EF4444';
}

export default function LocationMapScreen() {
  const {selectedShopId} = useAuthStore();
  const mapRef = useRef<any>(null);

  const {data: trackable = [], isLoading} = useQuery<TrackableBooking[]>({
    queryKey: ['staffLocationMapBookings', selectedShopId],
    queryFn: () => queueApi.getTrackableBookings(selectedShopId!).then(result => result.data || []),
    enabled: !!selectedShopId,
    refetchInterval: 10000,
  });

  const {data: shop} = useQuery({
    queryKey: ['staffLocationMapShop', selectedShopId],
    queryFn: () => shopApi.getById(selectedShopId!).then(result => result.data),
    enabled: !!selectedShopId,
  });

  const positioned = trackable.filter(item => item.location?.lat && item.location?.lng);
  const fallbackLat = shop?.latitude ?? 23.2599;
  const fallbackLng = shop?.longitude ?? 77.4126;

  const coordinates = useMemo(
    () => [
      {latitude: fallbackLat, longitude: fallbackLng},
      ...positioned.map(item => ({
        latitude: item.location!.lat,
        longitude: item.location!.lng,
      })),
    ],
    [fallbackLat, fallbackLng, positioned],
  );

  const focusMap = useCallback((animated: boolean) => {
    if (!mapRef.current || coordinates.length === 0) {
      return;
    }

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        animated ? 500 : 0,
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {top: 50, right: 50, bottom: 60, left: 50},
      animated,
    });
  }, [coordinates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      focusMap(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [focusMap]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      focusMap(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [focusMap]);

  if (!selectedShopId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Select a shop to view map</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const mapFallback = (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 }}>Map View is unavailable</Text>
      <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 }}>
        Google Play Services are missing or location services are disabled.
      </Text>
    </View>
  );

  if (!MapView || !Marker) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Location Map</Text>
          <Text style={styles.headerSubtitle}>Live positions shared by incoming clients</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.mapCanvas, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }]}>
            {mapFallback}
          </View>

          <View style={styles.listCard}>
            {trackable.length === 0 ? (
              <Text style={styles.emptySubtitle}>No upcoming trackable clients currently</Text>
            ) : positioned.length === 0 ? (
              <Text style={styles.emptySubtitle}>Clients exist, but no one has shared location yet.</Text>
            ) : (
              positioned.slice(0, 10).map(item => (
                <View key={item.id} style={styles.row}>
                  <View style={[styles.rowDot, {backgroundColor: etaColor(item.startTime)}]} />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowName}>{item.user?.name || 'Guest'}</Text>
                    <Text style={styles.rowMeta}>
                      ETA {new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Location Map</Text>
        <Text style={styles.headerSubtitle}>Live positions shared by incoming clients</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapCanvas}>
          <SafeMapViewContainer fallback={mapFallback}>
            <MapView
              provider={PROVIDER_GOOGLE}
              ref={(ref: any) => {
                mapRef.current = ref;
              }}
              style={styles.map}
              initialRegion={{
                latitude: fallbackLat,
                longitude: fallbackLng,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}>
              <Marker
                coordinate={{latitude: fallbackLat, longitude: fallbackLng}}
                title={shop?.name || 'Shop'}
                pinColor="#0EA5E9"
              />

              {positioned.map(item => (
                <Marker
                  key={item.id}
                  coordinate={{
                    latitude: item.location!.lat,
                    longitude: item.location!.lng,
                  }}
                  title={item.user?.name || 'Guest'}
                  description={`ETA ${new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`}
                  pinColor={etaColor(item.startTime)}
                />
              ))}
            </MapView>
          </SafeMapViewContainer>
          <Text style={styles.mapLegend}>Blue: shop • Green/Amber/Red: near to delayed ETAs</Text>
          <TouchableOpacity style={styles.recenterButton} onPress={() => focusMap(true)}>
            <Text style={styles.recenterText}>Recenter</Text>
          </TouchableOpacity>
          <View style={styles.coordsOverlay}>
            <Text style={styles.coordsLabel}>Shop Coordinates</Text>
            <Text style={styles.coordsValue}>{fallbackLat.toFixed(6)}, {fallbackLng.toFixed(6)}</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          {trackable.length === 0 ? (
            <Text style={styles.emptySubtitle}>No upcoming trackable clients currently</Text>
          ) : positioned.length === 0 ? (
            <Text style={styles.emptySubtitle}>Clients exist, but no one has shared location yet.</Text>
          ) : (
            positioned.slice(0, 10).map(item => (
              <View key={item.id} style={styles.row}>
                <View style={[styles.rowDot, {backgroundColor: etaColor(item.startTime)}]} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowName}>{item.user?.name || 'Guest'}</Text>
                  <Text style={styles.rowMeta}>
                    ETA {new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
  headerSubtitle: {marginTop: 2, fontSize: FontSize.body, color: Colors.textSecondary},
  content: {padding: Spacing.lg},
  mapCanvas: {
    height: 280,
    backgroundColor: '#ECFEFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    position: 'relative',
    overflow: 'hidden',
  },
  map: {flex: 1},
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    fontSize: FontSize.label,
    color: Colors.textSecondary,
  },
  recenterButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary200,
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  recenterText: {
    color: Colors.primary700,
    fontSize: FontSize.label,
    fontWeight: FontWeight.semibold,
  },
  coordsOverlay: {
    position: 'absolute',
    bottom: 30,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-end',
  },
  coordsLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
  },
  coordsValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  listCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  row: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm},
  rowDot: {width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm},
  rowContent: {flex: 1},
  rowName: {fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.medium},
  rowMeta: {fontSize: FontSize.label, color: Colors.textSecondary},
  emptyTitle: {fontSize: FontSize.h3, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  emptySubtitle: {fontSize: FontSize.body, color: Colors.textSecondary},
});
