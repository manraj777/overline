import { UserRole, TenantType, BookingStatus, BookingSource, PaymentStatus, DayOfWeek, StaffRole } from './enums';

// ============================================================================
// Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  staffRole?: StaffRole;
  tenantId?: string;
  shopId?: string;
  shopIds?: string[];
  staffProfileId?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  // Trust Score fields for queue integrity
  trustScore?: number;
  totalBookings?: number;
  completedBookings?: number;
  noShowBookings?: number;
  cancelledBookings?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================================
// Shop Types
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
}

export interface Shop {
  id: string;
  tenantId: string;
  tenant?: Tenant;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  coverUrl?: string;
  photoUrls: string[];
  maxConcurrentBookings: number;
  autoAcceptBookings: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopWithDetails extends Shop {
  services: Service[];
  staff: Staff[];
  workingHours: WorkingHours[];
  queueStats?: QueueStats;
}

export interface QueueStats {
  waitingCount: number;
  estimatedWaitMinutes: number;
  nextSlot: string | null;
}

// ============================================================================
// Service Types
// ============================================================================

export interface Service {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

// ============================================================================
// Staff Types
// ============================================================================

export interface Staff {
  id: string;
  shopId: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: StaffRole;
  isActive: boolean;
}

export interface StaffNotificationSettings {
  notifReminderMins?: number;
  notifCallAheadMins?: number;
  notifNewBooking?: boolean;
  notifLocationShare?: boolean;
  notifReview?: boolean;
  notifNoShow?: boolean;
}

export interface StaffProfile {
  id: string;
  userId: string;
  shopId: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  notificationSettings?: StaffNotificationSettings;
  user?: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
}

export interface StaffScheduleResponse {
  workingHours: Array<{
    id: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isOff: boolean;
  }>;
  timeOffs: Array<{
    id: string;
    startTime: string;
    endTime: string;
    reason?: string;
    status?: string;
  }>;
  profileSchedules?: Array<Record<string, unknown>>;
}

export interface StaffEarningsResponse {
  totalEarnings: number;
  commissionRate: number;
  breakdownType: string;
  breakdown: Array<{
    date: string;
    bookingCount: number;
    revenue: number;
    commission: number;
  }>;
  pendingPayment?: number;
  lastPayout?: { date: string; amount: number } | null;
}

// ============================================================================
// Working Hours
// ============================================================================

export interface WorkingHours {
  id: string;
  shopId: string;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  breakWindows: BreakWindow[];
}

export interface BreakWindow {
  start: string;
  end: string;
}

// ============================================================================
// Booking Types
// ============================================================================

export interface Booking {
  id: string;
  bookingNumber: string;
  userId?: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'trustScore' | 'totalBookings' | 'noShowBookings'>;
  shopId: string;
  shop?: Pick<Shop, 'id' | 'name' | 'slug' | 'address' | 'phone' | 'logoUrl'>;
  staffId?: string;
  staff?: Pick<Staff, 'id' | 'name'>;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  source: BookingSource;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  queuePosition?: number;
  notes?: string;
  adminNotes?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  services: BookingService[];
  payment?: Payment;
}

export interface BookingService {
  id: string;
  bookingId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
}

// ============================================================================
// Slot Types
// ============================================================================

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  staffId?: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface Payment {
  id: string;
  bookingId: string;
  provider: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  bookingId?: string;
  type: 'BOOKING_CONFIRMED' | 'BOOKING_REMINDER' | 'QUEUE_UPDATE' | 'NEW_MESSAGE';
  title: string;
  body: string;
  data: Record<string, any>;
  status: 'PENDING' | 'SENT' | 'FAILED';
  readAt: string | null;
  createdAt: string;
  booking?: {
    id: string;
    bookingNumber: string;
    status: BookingStatus;
    startTime: string;
    customerName: string;
  };
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// Owner Dashboard Contracts (Phase 3)
// ============================================================================

export interface OwnerFinancialTransaction {
  date: string;
  type: 'booking_payment' | 'payout' | 'refund';
  amount: number;
  status: string;
}

export interface OwnerFinancials {
  totalRevenue: number;
  totalPayouts: number;
  pendingSettlement: number;
  transactions: OwnerFinancialTransaction[];
  summary?: Record<string, unknown>;
}

export interface StaffPerformanceRow {
  id: string;
  name: string;
  avatarUrl?: string;
  bookings: number;
  onlineEarned: number;
  cashEarned: number;
  rating?: number;
  status?: string;
}

export interface QueueHeatmapCell {
  staffId: string;
  slot: string;
  utilization: number;
  bookingCount: number;
}
