import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shop } from '@/types';
import { useRouter } from 'next/router';
import { Clock, MapPin, Users, Navigation, RefreshCw, ExternalLink } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

// Define a custom div icon
const createCustomIcon = (isActive: boolean) => L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${isActive ? '#22c55e' : '#6366f1'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const createUserIcon = () => L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(59,130,246,0.6); animation: pulse 2s infinite;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

interface ShopMapProps {
    shops: Shop[];
    userLocation?: { lat: number; lng: number };
    onShopSelect?: (shop: Shop) => void;
    zoom?: number;
}

// Helper to re-center map when user location changes
const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom?: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom || 13);
    }, [center, map, zoom]);
    return null;
};

// Component to fix Leaflet container size issues (common with dynamic/lazy-loaded maps)
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        // Invalidate size after mount and after a short delay (for CSS transitions)
        const timer1 = setTimeout(() => map.invalidateSize(), 100);
        const timer2 = setTimeout(() => map.invalidateSize(), 500);

        // Also listen for window resize
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);

        // Observer for container visibility changes
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        const container = map.getContainer();
        if (container) observer.observe(container);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [map]);
    return null;
};

export const ShopMap: React.FC<ShopMapProps> = ({ shops, userLocation, onShopSelect, zoom }) => {
    const router = useRouter();
    const [currentLocation, setCurrentLocation] = useState(userLocation);
    const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
    const [routePoints, setRoutePoints] = useState<[number, number][] | null>(null);
    const [routeShopId, setRouteShopId] = useState<string | null>(null);

    // Sync prop changes
    useEffect(() => {
        if (userLocation) setCurrentLocation(userLocation);
    }, [userLocation]);

    useEffect(() => {
        // Fix leafjs default icon paths in Nextjs
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }, []);

    const refreshLocation = useCallback(() => {
        if (!('geolocation' in navigator)) return;
        setIsRefreshingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setIsRefreshingLocation(false);
            },
            () => setIsRefreshingLocation(false),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }, []);

    // Auto-fetch location on mount if not provided
    useEffect(() => {
        if (!currentLocation) refreshLocation();
    }, [currentLocation, refreshLocation]);

    const fetchRoute = useCallback(async (shopLat: number, shopLng: number, shopId: string) => {
        if (!currentLocation) return;
        try {
            // Use OSRM free routing service for shortest path
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${shopLng},${shopLat}?overview=full&geometries=geojson`
            );
            const data = await response.json();
            if (data.routes?.[0]?.geometry?.coordinates) {
                const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
                    (c: [number, number]) => [c[1], c[0]] as [number, number]
                );
                setRoutePoints(coords);
                setRouteShopId(shopId);
            }
        } catch {
            // Fallback: draw straight line
            setRoutePoints([
                [currentLocation.lat, currentLocation.lng],
                [shopLat, shopLng],
            ]);
            setRouteShopId(shopId);
        }
    }, [currentLocation]);

    const defaultCenter: [number, number] = currentLocation
        ? [currentLocation.lat, currentLocation.lng]
        : [28.6139, 77.2090]; // Default to Delhi

    const openGoogleDirections = (shop: Shop) => {
        const origin = currentLocation ? `${currentLocation.lat},${currentLocation.lng}` : '';
        const dest = `${shop.latitude},${shop.longitude}`;
        const url = origin
            ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
            : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
        window.open(url, '_blank');
    };

    return (
        <div className="h-full w-full min-h-[300px] rounded-lg overflow-hidden border border-outline-variant/10 relative">
            {/* Refresh Location Button */}
            <button
                onClick={refreshLocation}
                disabled={isRefreshingLocation}
                className="absolute top-3 right-3 z-[1000] bg-white dark:bg-surface-container shadow-lg rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-surface-container-high transition-all active:scale-95 border border-gray-200 dark:border-outline-variant/20"
                title="Refresh my location"
            >
                <Navigation className={`w-4 h-4 text-blue-600 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
            </button>

            <MapContainer
                center={defaultCenter}
                zoom={zoom || 12}
                style={{ height: '100%', width: '100%', minHeight: '300px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {/* Auto-fix map size on container changes */}
                <MapResizer />

                {currentLocation && (
                    <Marker position={[currentLocation.lat, currentLocation.lng]} icon={createUserIcon()}>
                        <Popup>
                            <div className="text-center">
                                <p className="font-bold text-sm text-gray-900">📍 You are here</p>
                                <button
                                    onClick={refreshLocation}
                                    className="mt-1 text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 mx-auto"
                                >
                                    <RefreshCw className="w-3 h-3" /> Refresh
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                )}

                <MapUpdater center={defaultCenter} zoom={zoom} />

                {/* Route polyline */}
                {routePoints && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '8, 6' }}
                    />
                )}

                {shops.map((shop) => {
                    if (!shop.latitude || !shop.longitude) return null;
                    return (
                        <Marker
                            key={shop.id}
                            position={[shop.latitude, shop.longitude]}
                            icon={createCustomIcon(routeShopId === shop.id)}
                        >
                            <Popup className="shop-popup p-0 m-0 w-72">
                                <div className="flex flex-col">
                                    {shop.coverUrl ? (
                                        <img src={shop.coverUrl} alt={shop.name} className="w-full h-24 object-cover" />
                                    ) : (
                                        <div className="w-full h-24 bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                                            <span className="text-indigo-500 font-bold text-2xl">{shop.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="p-3 space-y-2">
                                        <h3 className="font-bold text-gray-900 leading-tight text-sm">{shop.name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 line-clamp-1">
                                            <MapPin className="w-3 h-3 shrink-0" /> {shop.city}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                                <Users className="w-3 h-3 mr-1 inline" />
                                                {shop.queueStats?.waitingCount || 0} in queue
                                            </Badge>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 text-xs"
                                                onClick={() => {
                                                    if (onShopSelect) onShopSelect(shop);
                                                    router.push(`/shops/${shop.slug}`);
                                                }}
                                            >
                                                View & Book
                                            </Button>
                                            <button
                                                onClick={() => {
                                                    if (currentLocation) {
                                                        fetchRoute(shop.latitude!, shop.longitude!, shop.id);
                                                    }
                                                    openGoogleDirections(shop);
                                                }}
                                                className="flex items-center gap-1 px-2.5 h-8 text-[11px] font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                                title="Get Directions"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Route
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};
