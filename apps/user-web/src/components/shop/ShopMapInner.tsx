import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Star, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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

export const ShopMapInner: React.FC<ShopMapProps> = ({
    shops,
    userLocation,
    className = '',
    zoom = 13
}) => {
    const router = useRouter();
    const [customIcon, setCustomIcon] = useState<L.DivIcon | null>(null);
    const [userIcon, setUserIcon] = useState<L.DivIcon | null>(null);

    // Default to a central coordinate if no user location (e.g., center of India/Delhi or user's city)
    const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi
    const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

    useEffect(() => {
        // Create a sleek, modern, minimal dot icon for shops
        const shopIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="w-4 h-4 rounded-full bg-white border-4 border-lexo-black shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        });
        setCustomIcon(shopIcon);

        const uIcon = L.divIcon({
            className: 'user-marker',
            html: `<div class="relative w-6 h-6"><div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div><div class="relative w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        setUserIcon(uIcon);
    }, []);

    if (!customIcon || !userIcon) return null;

    return (
        <div className={`w-full overflow-hidden rounded-[2.5rem] relative ${className}`}>
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                className="w-full h-full z-0"
                zoomControl={false} // Disable default zoom for cleaner UI
            >
                <TileLayer
                    attribution={MAP_ATTRIBUTION}
                    url={MAP_TILES}
                />

                {userLocation && (
                    <MapCenterUpdater center={center} />
                )}

                {/* User Location Marker (Blue Dot) */}
                {userLocation && (
                    <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={userIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="font-bold text-lexo-black">You are here</div>
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
                                        className="h-24 w-full rounded-xl bg-gray-200 mb-3 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${shop.coverUrl || shop.logoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80'})` }}
                                    />

                                    <h3 className="font-bold text-lexo-black text-lg leading-tight mb-1">{shop.name}</h3>
                                    <a
                                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${shop.address}, ${shop.city}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:underline block text-xs mb-3 truncate transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {shop.address}, {shop.city}
                                    </a>

                                    <div className="flex justify-between items-center mb-3">
                                        <span className="flex items-center gap-1 text-amber-500 text-sm font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                                            <Star className="w-3 h-3 fill-current" /> 4.9
                                        </span>
                                        <span className="flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-2 py-0.5 rounded-md">
                                            <Clock className="w-3 h-3" /> 0 wait
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => router.push(`/shops/${shop.slug}`)}
                                        className="w-full bg-lexo-black text-white text-sm font-bold py-2 rounded-lg hover:bg-lexo-dark transition-colors"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Decorative Gradient Overlays for sleek blending */}
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-lexo-charcoal/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-lexo-charcoal/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-lexo-charcoal/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-lexo-charcoal/20 to-transparent pointer-events-none z-10" />
        </div>
    );
};
