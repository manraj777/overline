import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shop } from '@/types';
import { useRouter } from 'next/router';
import { Clock, MapPin, Users } from 'lucide-react';
import { Badge, Button } from '@/components/ui';

// Define a custom div icon
const createCustomIcon = (isActive: boolean) => L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${isActive ? '#3b82f6' : '#6366f1'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

interface ShopMapProps {
    shops: Shop[];
    userLocation?: { lat: number; lng: number };
    onShopSelect?: (shop: Shop) => void;
}

// Helper to re-center map when user location changes
const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13);
    }, [center, map]);
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

export const ShopMap: React.FC<ShopMapProps> = ({ shops, userLocation, onShopSelect }) => {
    const router = useRouter();

    useEffect(() => {
        // Fix leafjs default icon paths in Nextjs
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }, []);

    const defaultCenter: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [28.6139, 77.2090]; // Default to Delhi

    return (
        <div className="h-full w-full min-h-[300px] rounded-lg overflow-hidden border border-outline-variant/10">
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ height: '100%', width: '100%', minHeight: '300px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {/* Auto-fix map size on container changes */}
                <MapResizer />

                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={createCustomIcon(true)}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}

                <MapUpdater center={defaultCenter} />

                {shops.map((shop) => {
                    if (!shop.latitude || !shop.longitude) return null;
                    return (
                        <Marker
                            key={shop.id}
                            position={[shop.latitude, shop.longitude]}
                        >
                            <Popup className="shop-popup p-0 m-0 w-64">
                                <div className="flex flex-col">
                                    {shop.coverUrl ? (
                                        <img src={shop.coverUrl} alt={shop.name} className="w-full h-24 object-cover" />
                                    ) : (
                                        <div className="w-full h-24 bg-primary-100 flex items-center justify-center">
                                            <span className="text-primary-500 font-medium">{shop.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <h3 className="font-semibold text-gray-900 leading-tight">{shop.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 line-clamp-1">
                                            <MapPin className="w-3 h-3" /> {shop.city}
                                        </p>

                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                                <Users className="w-3 h-3 mr-1 inline" />
                                                {shop.queueStats?.waitingCount || 0} in queue
                                            </Badge>
                                        </div>

                                        <Button
                                            size="sm"
                                            className="w-full mt-3 h-8 text-xs"
                                            onClick={() => {
                                                if (onShopSelect) onShopSelect(shop);
                                                router.push(`/shops/${shop.slug}`);
                                            }}
                                        >
                                            View Details & Book
                                        </Button>
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
