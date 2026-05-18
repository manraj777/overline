import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Star, Clock, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shop } from '@/types';

const MAP_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface ShopMapProps {
    shops: Shop[];
    userLocation?: { lat: number; lng: number };
    className?: string;
    zoom?: number;
}

// Component to handle map re-centering when userLocation changes
const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

// Fix for Leaflet rendering issues in dynamically sized containers
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        const timer1 = setTimeout(() => map.invalidateSize(), 100);
        const timer2 = setTimeout(() => map.invalidateSize(), 500);
        const timer3 = setTimeout(() => map.invalidateSize(), 1500);

        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);

        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        const container = map.getContainer();
        if (container) observer.observe(container);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [map]);
    return null;
};

// Fit map bounds to include both user location and route
const FitRouteBounds = ({ userLocation, shopLocation }: { userLocation: [number, number]; shopLocation: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        const bounds = L.latLngBounds([userLocation, shopLocation]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }, [map, userLocation, shopLocation]);
    return null;
};

// Decode OSRM polyline geometry (polyline6 encoding)
function decodePolyline(encoded: string): [number, number][] {
    const coords: [number, number][] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
}

export const ShopMapInner: React.FC<ShopMapProps> = ({
    shops,
    userLocation,
    className = '',
    zoom = 13
}) => {
    const router = useRouter();
    const [customIcon, setCustomIcon] = useState<L.DivIcon | null>(null);
    const [userIcon, setUserIcon] = useState<L.DivIcon | null>(null);
    const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [showRoute, setShowRoute] = useState(false);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // Default to a central coordinate if no user location
    const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi
    const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

    // Get the first shop's location for routing
    const targetShop = shops[0];
    const shopLatLng = React.useMemo<[number, number] | null>(() => {
        if (targetShop?.latitude && targetShop?.longitude) {
            return [Number(targetShop.latitude), Number(targetShop.longitude)];
        }
        return null;
    }, [targetShop?.latitude, targetShop?.longitude]);

    const fetchRoute = useCallback(async () => {
        if (!userLocation || !shopLatLng) return;

        setLoadingRoute(true);
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${shopLatLng[1]},${shopLatLng[0]}?overview=full&geometries=polyline`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const decoded = decodePolyline(route.geometry);
                setRouteCoords(decoded);

                const distKm = (route.distance / 1000).toFixed(1);
                const durMin = Math.round(route.duration / 60);
                setRouteInfo({
                    distance: `${distKm} km`,
                    duration: durMin < 60 ? `${durMin} min` : `${Math.floor(durMin / 60)}h ${durMin % 60}m`,
                });
            }
        } catch (err) {
            console.warn('Route fetch failed:', err);
        } finally {
            setLoadingRoute(false);
        }
    }, [userLocation, shopLatLng]);

    const handleToggleRoute = useCallback(() => {
        if (!showRoute && !routeCoords) {
            fetchRoute();
        }
        setShowRoute((prev) => !prev);
    }, [showRoute, routeCoords, fetchRoute]);

    useEffect(() => {
        // Fix Leaflet default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create a sleek, modern, minimal dot icon for shops
        const shopIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: white; border: 4px solid #09090b; box-shadow: 0 0 15px rgba(255,255,255,0.8);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        });
        setCustomIcon(shopIcon);

        const uIcon = L.divIcon({
            className: 'user-marker',
            html: `<div style="position: relative; width: 24px; height: 24px;"><div style="position: absolute; inset: 0; background: #3b82f6; border-radius: 50%; opacity: 0.75; animation: ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div><div style="position: relative; width: 24px; height: 24px; background: #2563eb; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        setUserIcon(uIcon);
    }, []);

    if (!customIcon || !userIcon) return (
        <div className={`w-full min-h-[300px] overflow-hidden rounded-[2.5rem] relative bg-surface-container animate-pulse flex items-center justify-center ${className}`}>
            <span className="text-on-surface-variant text-sm">Loading Map...</span>
        </div>
    );

    return (
        <div className={`w-full overflow-hidden rounded-[2.5rem] relative ${className}`} style={{ minHeight: '300px' }}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                className="w-full h-full z-0"
                style={{ minHeight: '300px' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution={MAP_ATTRIBUTION}
                    url={MAP_TILES}
                />

                {/* Auto-fix map sizing */}
                <MapResizer />

                {userLocation && (
                    <MapCenterUpdater center={center} />
                )}

                {/* Fit bounds when showing route */}
                {showRoute && routeCoords && userLocation && shopLatLng && (
                    <FitRouteBounds
                        userLocation={[userLocation.lat, userLocation.lng]}
                        shopLocation={shopLatLng}
                    />
                )}

                {/* Route Polyline */}
                {showRoute && routeCoords && (
                    <Polyline
                        positions={routeCoords}
                        pathOptions={{
                            color: '#2563EB',
                            weight: 5,
                            opacity: 0.8,
                            dashArray: '12, 8',
                            lineCap: 'round',
                            lineJoin: 'round',
                        }}
                    />
                )}

                {/* User Location Marker (Blue Dot) */}
                {userLocation && (
                    <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={userIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="font-bold text-gray-900">You are here</div>
                        </Popup>
                    </Marker>
                )}

                {/* Shop Markers */}
                {shops.map((shop) => {
                    if (!shop.latitude || !shop.longitude) return null;

                    return (
                        <Marker
                            key={shop.id}
                            position={[Number(shop.latitude), Number(shop.longitude)]}
                            icon={customIcon}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[200px]">
                                {/* Shop Cover Image */}
                                    <div
                                        className="h-32 w-full rounded-t-xl bg-gray-200 mb-3 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${shop.coverUrl || shop.logoUrl || shop.photoUrls?.[0] || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80'})` }}
                                    />

                                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{shop.name}</h3>
                                    <a
                                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${shop.address}, ${shop.city}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline block text-xs mb-3 truncate transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {shop.address}, {shop.city}
                                    </a>

                                    <div className="flex justify-between items-center mb-3">
                                        <span className="flex items-center gap-1 text-amber-500 text-sm font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                                            <Star className="w-3 h-3 fill-current" /> {shop.googleRating || 4.9}
                                        </span>
                                        <span className="flex items-center gap-1 text-blue-600 text-sm font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                                            <Clock className="w-3 h-3" /> {(shop as any).queueStats?.waitingCount || 0} waiting
                                        </span>
                                    </div>

                                    <div className="pb-1 space-y-2">
                                        <button
                                            onMouseDown={(e) => { e.stopPropagation(); router.push(`/shops/${shop.slug}`); }}
                                            onTouchStart={(e) => { e.stopPropagation(); router.push(`/shops/${shop.slug}`); }}
                                            className="w-full bg-primary text-white text-sm font-bold py-2.5 rounded-lg hover:bg-primary-700 active:scale-95 transition-all shadow-md relative z-50 pointer-events-auto cursor-pointer"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Show Route Button — floating on the map */}
            {userLocation && shopLatLng && (
                <button
                    onClick={handleToggleRoute}
                    disabled={loadingRoute}
                    className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 text-sm font-bold transition-all hover:shadow-xl active:scale-95"
                >
                    <Navigation className={`w-4 h-4 ${showRoute ? 'text-blue-600' : 'text-gray-500'}`} />
                    {loadingRoute ? 'Loading...' : showRoute ? 'Hide Route' : 'Show Route'}
                </button>
            )}

            {/* Route Info Badge */}
            {showRoute && routeInfo && (
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg">
                    <span>🚗 {routeInfo.distance}</span>
                    <span className="w-px h-4 bg-white/30" />
                    <span>⏱ {routeInfo.duration}</span>
                </div>
            )}

            {/* Decorative Gradient Overlays for sleek blending */}
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-surface/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface/20 to-transparent pointer-events-none z-10" />
        </div>
    );
};
