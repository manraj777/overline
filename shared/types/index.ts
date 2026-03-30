export type QueueStatus = 'waiting' | 'approaching' | 'in_progress' | 'completed' | 'no_show';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface Shop {
  id: string;
  name: string;
  type: 'Salon' | 'Clinic' | 'Spa' | 'Dental';
  city: string;
  address: string;
  location: GeoPoint;
  rating: number;
  averageServiceMinutes: number;
  services: ServiceItem[];
  logoUrl: string;
  coverUrl: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  city: string;
  email?: string;
  location: GeoPoint;
  blocked?: boolean;
  createdAt: string;
}

export interface QueueEntry {
  id: string;
  shopId: string;
  userId: string;
  tokenCode: string;
  serviceName: string;
  serviceDurationMinutes: number;
  position: number;
  aheadCount: number;
  status: QueueStatus;
  joinedAt: string;
  estimatedWaitMinutes: number;
  estimatedStartAt: string;
}

export interface Appointment {
  id: string;
  userId: string;
  shopId: string;
  serviceName: string;
  tokenCode: string;
  scheduleAt: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  queueEntryId?: string;
  createdAt: string;
}

export interface NotificationEvent {
  id: string;
  shopId: string;
  userId?: string;
  type: 'new_booking' | 'cancellation' | 'check_in' | 'turn_approaching' | 'fraud_alert';
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
}

export interface FraudLog {
  id: string;
  shopId: string;
  phone: string;
  type: 'rate_limit' | 'duplicate_token' | 'geo_anomaly' | 'token_mismatch';
  severity: 'warning' | 'critical';
  description: string;
  createdAt: string;
}
