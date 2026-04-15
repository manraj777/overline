import { UserRole, TenantType, BookingStatus, BookingSource, PaymentStatus, DayOfWeek } from './enums';

// ============================================================================
// Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  role: UserRole;
  tenantId?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
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
  googleRating?: number | string;
  googleReviewsCount?: number;
  maxConcurrentBookings: number;
  autoAcceptBookings: boolean;
  isActive: boolean;
  timezone?: string;
  workingHours?: WorkingHours[];
  distance?: number; // Distance in km (populated when user provides location)
  queueStats?: QueueStats;
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
  role: string;
  isActive: boolean;
  staffServices?: Array<{ serviceId: string }>;
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
  user?: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
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
  verificationCode?: string;
  serviceStatus?: string;
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

export interface ShopSlotStatus {
  time: string;
  serviceId: string;
  isBooked: boolean;
  bookedBy?: string;
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
  }

  // ============================================================================
// Wallet Types
// ============================================================================

export interface WalletTransaction {
  id: string;
  type: 'EARNED' | 'SPENT' | 'EXPIRED' | 'REFERRAL';
  amount: number;
  description: string;
  createdAt: string;
}

export interface WalletData {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  freeCashBalance: number;
  lockedAmount: number;
  transactions: WalletTransaction[];
}

export interface WalletBalance {
  balance: number;
  freeCashBalance: number;
  lockedAmount: number;
  totalAvailable: number;
  totalEarned: number;
  
  
}
