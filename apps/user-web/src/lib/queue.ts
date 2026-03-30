export type QueueEntryStatus = 'waiting' | 'approaching' | 'in_progress' | 'completed';

export interface QueueEntry {
  id: string;
  userId: string;
  userName: string;
  shopId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  tokenCode: string;
  position: number;
  status: QueueEntryStatus;
  joinedAt: string;
  estimatedStartAt: string;
}

export interface ShopPreview {
  id: string;
  name: string;
  type: 'Salon' | 'Clinic' | 'Spa' | 'Dental';
  city: string;
  rating: number;
  distanceKm: number;
  liveQueueCount: number;
  coverImage: string;
  latitude: number;
  longitude: number;
  averageServiceMinutes: number;
}

export interface BookingTimelineItem {
  id: string;
  shopName: string;
  dateLabel: string;
  slotLabel: string;
  tokenCode: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
}

export const CATEGORY_CHIPS = ['Salon', 'Clinic', 'Spa', 'Dental', 'Barber', 'Wellness'];

export const MARQUEE_ITEMS = [
  'Haircut',
  'Facial',
  'Skin Consult',
  'Dental Cleanup',
  'Body Massage',
  'Beard Styling',
  'Wellness Therapy',
];

export const DUMMY_SHOPS: ShopPreview[] = [
  {
    id: 'shop-grooming-lab',
    name: 'The Grooming Lab',
    type: 'Salon',
    city: 'Bhopal',
    rating: 4.8,
    distanceKm: 1.3,
    liveQueueCount: 3,
    coverImage:
      'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80',
    latitude: 23.2599,
    longitude: 77.4126,
    averageServiceMinutes: 20,
  },
  {
    id: 'shop-clearskin-clinic',
    name: 'ClearSkin Clinic',
    type: 'Clinic',
    city: 'Bhopal',
    rating: 4.7,
    distanceKm: 2.1,
    liveQueueCount: 2,
    coverImage:
      'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',
    latitude: 23.235,
    longitude: 77.397,
    averageServiceMinutes: 30,
  },
  {
    id: 'shop-zen-spa',
    name: 'Zen Spa',
    type: 'Spa',
    city: 'Bhopal',
    rating: 4.9,
    distanceKm: 3.5,
    liveQueueCount: 1,
    coverImage:
      'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80',
    latitude: 23.221,
    longitude: 77.43,
    averageServiceMinutes: 35,
  },
];

export const DUMMY_BOOKINGS: BookingTimelineItem[] = [
  {
    id: 'bk-1',
    shopName: 'The Grooming Lab',
    dateLabel: 'Today',
    slotLabel: '5:30 PM',
    tokenCode: '#0021',
    status: 'upcoming',
  },
  {
    id: 'bk-2',
    shopName: 'ClearSkin Clinic',
    dateLabel: 'Tomorrow',
    slotLabel: '11:00 AM',
    tokenCode: '#0104',
    status: 'upcoming',
  },
  {
    id: 'bk-3',
    shopName: 'Zen Spa',
    dateLabel: '24 Mar 2026',
    slotLabel: '3:00 PM',
    tokenCode: '#0009',
    status: 'completed',
  },
];

export const DUMMY_QUEUE: QueueEntry[] = [
  {
    id: 'queue-21',
    userId: 'user-1',
    userName: 'Aarav Sharma',
    shopId: 'shop-grooming-lab',
    serviceName: 'Haircut',
    serviceDurationMinutes: 20,
    tokenCode: '#0021',
    position: 1,
    status: 'waiting',
    joinedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    estimatedStartAt: new Date(Date.now() + 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'queue-22',
    userId: 'user-2',
    userName: 'Neha Jain',
    shopId: 'shop-grooming-lab',
    serviceName: 'Beard',
    serviceDurationMinutes: 15,
    tokenCode: '#0022',
    position: 2,
    status: 'in_progress',
    joinedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    estimatedStartAt: new Date(Date.now() + 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'queue-23',
    userId: 'user-3',
    userName: 'Kabir Singh',
    shopId: 'shop-grooming-lab',
    serviceName: 'Facial',
    serviceDurationMinutes: 40,
    tokenCode: '#0023',
    position: 3,
    status: 'completed',
    joinedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    estimatedStartAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
];

export function generateTokenCode(existingCodes: string[]): string {
  const existing = new Set(existingCodes);
  let token = '#0001';
  while (existing.has(token)) {
    const next = Number(token.replace('#', '')) + 1;
    token = `#${next.toString().padStart(4, '0')}`;
  }
  return token;
}

export function estimateWaitMinutes(aheadCount: number, averageServiceMinutes: number): number {
  return Math.max(0, aheadCount * averageServiceMinutes);
}

export function computeQueueState(aheadCount: number): QueueEntryStatus {
  if (aheadCount <= 0) return 'in_progress';
  if (aheadCount <= 2) return 'approaching';
  return 'waiting';
}

export function statusLabel(status: QueueEntryStatus): string {
  if (status === 'waiting') return 'Waiting';
  if (status === 'approaching') return 'Turn Approaching';
  if (status === 'in_progress') return 'In Service';
  return 'Completed';
}

export function mapBackendBookingStatus(status: string): QueueEntryStatus {
  if (status === 'IN_PROGRESS') return 'in_progress';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'completed';
  if (status === 'CONFIRMED') return 'approaching';
  if (status === 'PENDING') return 'waiting';
  return 'waiting';
}
