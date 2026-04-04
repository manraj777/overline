import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, Star, Users, Navigation } from 'lucide-react';
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

  let distanceKm = shop.distance;
  let travelTime: string | undefined;
  if (distanceKm !== undefined && distanceKm !== null) {
    travelTime = formatTravelTime(distanceKm);
  }

  const heroImage = shop.coverUrl || shop.photoUrls?.[0] || shop.logoUrl;

  return (
    <Link href={`/shops/${shop.slug}`}>
      <div className="card-m3 overflow-hidden cursor-pointer group h-full">
        {/* ── Image Header ── */}
        <div className="relative h-48 overflow-hidden bg-surface-container-high">
          {heroImage ? (
            <img
              src={heroImage}
              alt={shop.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
              <span className="text-5xl text-white/60 font-black tracking-tighter">
                {shop.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-2">
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
            <div className="absolute top-3 right-3">
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md text-on-surface text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                <Navigation className="w-3 h-3 text-primary" />
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`}
              </div>
            </div>
          )}

          {/* Logo overlay */}
          {shop.logoUrl && heroImage !== shop.logoUrl && (
            <div className="absolute bottom-3 left-3">
              <img
                src={shop.logoUrl}
                alt=""
                className="w-10 h-10 rounded-xl border-2 border-white shadow-md object-cover"
              />
            </div>
          )}

          {/* Photo count */}
          {shop.photoUrls?.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
              +{shop.photoUrls.length - 1} photos
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
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.address}, ${shop.city}`)}`, '_blank', 'noopener,noreferrer');
              }}
              className="truncate hover:text-primary hover:underline transition-all text-left font-medium"
            >
              {shop.address}, {shop.city}
            </button>
          </div>

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
              <span className="font-bold text-on-surface text-sm">4.8</span>
              <span className="text-outline text-xs">(120)</span>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-button flex items-center gap-1">
                Book <Clock className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Queue Stats */}
          {(shop.queueStats || queueInfo) && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/10">
              <div className="flex items-center text-xs text-on-surface-variant font-medium">
                <Users className="w-3.5 h-3.5 mr-1 text-secondary" />
                <span>{(shop.queueStats?.waitingCount ?? queueInfo?.peopleInQueue) || 0} in queue</span>
              </div>
              <div className="flex items-center text-xs text-on-surface-variant font-medium">
                <Clock className="w-3.5 h-3.5 mr-1 text-tertiary" />
                <span>~{(shop.queueStats?.estimatedWaitMinutes ?? queueInfo?.currentWait) || 0} min</span>
              </div>
            </div>
          )}
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

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function isShopOpenNow(shop: Shop): boolean {
  if (!shop.isActive) {
    return false;
  }

  const todaysHours = shop.workingHours;
  if (!todaysHours || todaysHours.length === 0) {
    return true;
  }

  const now = new Date();
  const timezone = shop.timezone || 'Asia/Kolkata';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const currentMinutes = hour * 60 + minute;

  if (!weekday) {
    return true;
  }

  const today = todaysHours.find((entry) => entry.dayOfWeek === weekday.toUpperCase());
  if (!today || today.isClosed) {
    return false;
  }

  const openMinutes = parseTimeToMinutes(today.openTime);
  const closeMinutes = parseTimeToMinutes(today.closeTime);

  if (closeMinutes === openMinutes) {
    return true;
  }

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

export { ShopCard };
