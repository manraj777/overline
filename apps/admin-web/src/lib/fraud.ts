export interface BookingAttempt {
  phone: string;
  shopId: string;
  tokenCode: string;
  bookedAt: string;
  userLat?: number;
  userLng?: number;
  shopLat?: number;
  shopLng?: number;
}

export interface FraudAlert {
  id: string;
  type: 'rate_limit' | 'duplicate_token' | 'geo_anomaly';
  severity: 'warning' | 'critical';
  phone: string;
  shopId: string;
  message: string;
  createdAt: string;
}

export function detectRateLimit(phone: string, attempts: BookingAttempt[]): FraudAlert | null {
  const lastHourCutoff = Date.now() - 60 * 60 * 1000;
  const count = attempts.filter((attempt) => {
    return attempt.phone === phone && new Date(attempt.bookedAt).getTime() >= lastHourCutoff;
  }).length;

  if (count <= 3) return null;

  return {
    id: `rate-${Date.now()}`,
    type: 'rate_limit',
    severity: 'critical',
    phone,
    shopId: attempts.find((entry) => entry.phone === phone)?.shopId ?? 'unknown',
    message: `Phone ${maskPhone(phone)} exceeded 3 bookings in 1 hour.`,
    createdAt: new Date().toISOString(),
  };
}

export function detectDuplicateToken(candidate: BookingAttempt, active: BookingAttempt[]): FraudAlert | null {
  const duplicate = active.find(
    (attempt) =>
      attempt.tokenCode === candidate.tokenCode &&
      attempt.shopId !== candidate.shopId &&
      isActiveAttempt(attempt.bookedAt)
  );

  if (!duplicate) return null;

  return {
    id: `dup-${Date.now()}`,
    type: 'duplicate_token',
    severity: 'critical',
    phone: candidate.phone,
    shopId: candidate.shopId,
    message: `Token ${candidate.tokenCode} is active in multiple shops simultaneously.`,
    createdAt: new Date().toISOString(),
  };
}

export function detectGeoAnomaly(candidate: BookingAttempt): FraudAlert | null {
  if (!hasGeo(candidate)) return null;
  const distance = haversineKm(
    candidate.userLat as number,
    candidate.userLng as number,
    candidate.shopLat as number,
    candidate.shopLng as number
  );

  if (distance <= 50) return null;

  return {
    id: `geo-${Date.now()}`,
    type: 'geo_anomaly',
    severity: 'warning',
    phone: candidate.phone,
    shopId: candidate.shopId,
    message: `Booking created ${distance.toFixed(1)}km away from shop location.`,
    createdAt: new Date().toISOString(),
  };
}

export function evaluateFraud(candidate: BookingAttempt, allAttempts: BookingAttempt[]): FraudAlert[] {
  const alerts: Array<FraudAlert | null> = [
    detectRateLimit(candidate.phone, allAttempts),
    detectDuplicateToken(candidate, allAttempts),
    detectGeoAnomaly(candidate),
  ];
  return alerts.filter(Boolean) as FraudAlert[];
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
}

function hasGeo(attempt: BookingAttempt): boolean {
  return (
    typeof attempt.userLat === 'number' &&
    typeof attempt.userLng === 'number' &&
    typeof attempt.shopLat === 'number' &&
    typeof attempt.shopLng === 'number'
  );
}

function isActiveAttempt(bookedAt: string): boolean {
  return Date.now() - new Date(bookedAt).getTime() <= 6 * 60 * 60 * 1000;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
