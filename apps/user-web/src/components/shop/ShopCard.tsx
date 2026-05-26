import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, Star, Users, Navigation, MessageCircle } from 'lucide-react';
import { isShopOpenNow } from '@/lib/utils';
import type { Shop } from '@/types';

interface ShopCardProps {
  shop: Shop;
  queueInfo?: {
    currentWait: number;
    peopleInQueue: number;
  };
  userLocation?: { lat: number; lng: number; address?: string };
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, queueInfo, userLocation }) => {
  const isOpen = isShopOpenNow(shop);
  const ratingValue = getShopRating(shop);
  const ratingCount = Number(shop.googleReviewsCount || 0);

  let distanceKm = shop.distance;
  let travelTime: string | undefined;
  if (distanceKm !== undefined && distanceKm !== null) {
    travelTime = formatTravelTime(distanceKm);
  }

  const [currentPhotoIdx, setCurrentPhotoIdx] = React.useState(0);

  const photos = React.useMemo(() => {
    const list: string[] = [];
    if (shop.coverUrl) list.push(shop.coverUrl);
    if (shop.photoUrls && Array.isArray(shop.photoUrls)) {
      shop.photoUrls.forEach((url) => {
        if (url && url !== shop.coverUrl) list.push(url);
      });
    }
    if (list.length === 0 && shop.logoUrl) list.push(shop.logoUrl);
    return list;
  }, [shop.coverUrl, shop.photoUrls, shop.logoUrl]);

  React.useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <Link href={`/shops/${shop.slug}`}>
      <div className="card-m3 overflow-hidden cursor-pointer group h-full">
        {/* ── Image Header ── */}
        <div className="relative h-48 overflow-hidden bg-surface-container-high">
          {photos.length > 0 ? (
            <div className="relative w-full h-full">
              {photos.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={shop.name}
                  style={{
                    opacity: index === currentPhotoIdx ? 1 : 0,
                    zIndex: index === currentPhotoIdx ? 1 : 0,
                    transition: 'opacity 1000ms ease-in-out, transform 500ms ease-out',
                  }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transform"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
              <span className="text-5xl text-white/60 font-black tracking-tighter">
                {shop.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-[2]" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-2 z-[3]">
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${
              isOpen
                ? 'bg-tertiary/90 text-white'
                : 'bg-error/90 text-white'
            }`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>

          {/* Distance badge */}
          {distanceKm !== undefined && (
            <div className="absolute top-3 right-3 z-[3]">
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md text-on-surface text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                <Navigation className="w-3 h-3 text-primary" />
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`}
              </div>
            </div>
          )}

          {/* Logo overlay */}
          {shop.logoUrl && photos[currentPhotoIdx] !== shop.logoUrl && (
            <div className="absolute bottom-3 left-3 z-[3]">
              <img
                src={shop.logoUrl}
                alt=""
                className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover"
              />
            </div>
          )}

          {/* Slide Indicators */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-1 z-[3] bg-black/40 px-2 py-1 rounded-full backdrop-blur-md">
              {photos.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentPhotoIdx ? 'bg-white w-3.5' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Info Body ── */}
        <div className="p-5">
          <h3 className="font-bold text-on-surface text-base mb-1 group-hover:text-primary transition-colors">
            {shop.name}
          </h3>

          {shop.description && (
            <p className="text-sm text-on-surface-variant mb-3 line-clamp-1">{shop.description}</p>
          )}

          <div className="flex items-center text-on-surface-variant text-xs mb-3">
            <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-outline" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`, '_blank', 'noopener,noreferrer');
              }}
              className="truncate hover:text-primary hover:underline transition-all text-left font-medium"
            >
              {shop.address}, {shop.city}
            </button>
          </div>

          {shop.phone && (
            <div className="flex items-center mb-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const phoneNum = (shop.phone || '').replace(/\D/g, '');
                  window.open(`https://wa.me/91${phoneNum}`, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors border border-emerald-100"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          )}

          {/* Distance & Travel time */}
          {distanceKm !== undefined && travelTime && (
            <div className="flex items-center gap-2 text-[11px] text-primary font-semibold mb-3">
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m away` : `${distanceKm.toFixed(1)} km away`}
              </span>
              <span className="text-outline-variant">•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{travelTime} walk
              </span>
            </div>
          )}

          {/* Rating & Quick Book */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-bold text-on-surface text-sm">
                {ratingValue !== null ? ratingValue.toFixed(1) : 'New'}
              </span>
              <span className="text-outline text-xs">({ratingCount})</span>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-button flex items-center gap-1">
                Book <Clock className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Queue Stats */}
          {(() => {
            const queueCount = (shop.queueStats?.waitingCount ?? queueInfo?.peopleInQueue) || 0;
            const waitTime = (shop.queueStats?.estimatedWaitMinutes ?? queueInfo?.currentWait) || 0;
            
            if (queueCount === 0 && isOpen) {
              return (
                <div className="flex items-center pt-3 mt-3 border-t border-outline-variant/10">
                  <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 w-full justify-center">
                    <span className="relative flex h-2 w-2 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Available Now - No Wait Time
                  </div>
                </div>
              );
            }

            return (
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/10">
                <div className="flex items-center text-xs text-on-surface-variant font-medium">
                  <Users className="w-3.5 h-3.5 mr-1 text-secondary" />
                  <span>{queueCount} in queue</span>
                </div>
                <div className="flex items-center text-xs text-on-surface-variant font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1 text-tertiary" />
                  <span>~{waitTime} min</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </Link>
  );
};

function formatTravelTime(distanceKm: number): string {
  const walkSpeedKmh = 5;
  const minutes = Math.round((distanceKm / walkSpeedKmh) * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes >= 60) return `${Math.round(minutes / 60)}h ${minutes % 60}min`;
  return `${minutes} min`;
}

function getShopRating(shop: Shop): number | null {
  if (shop.googleRating === undefined || shop.googleRating === null) {
    return null;
  }

  const rating = typeof shop.googleRating === 'string'
    ? Number.parseFloat(shop.googleRating)
    : Number(shop.googleRating);

  return Number.isFinite(rating) ? rating : null;
}



export { ShopCard };
