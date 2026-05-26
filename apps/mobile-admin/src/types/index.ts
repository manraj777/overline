// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  OtpVerify: {
    phone: string;
    flow: 'LOGIN_2FA' | 'PHONE_LOGIN';
    requestedRole?: 'OWNER' | 'STAFF' | 'USER' | 'SUPER_ADMIN';
    selectedShopId?: string;
  };
  Main: undefined;
  ShopSetup: undefined;
  BookingDetail: {bookingId: string};
  VerifyCode: undefined;
  ServiceForm: {shopId: string; serviceId?: string};
  ShopSettings: {shopId: string};
  WorkingHours: {shopId: string};
  StaffManagement: {shopId: string};
  AddStaff: undefined;
  Analytics: {shopId: string};
  PayoutDetails: {shopId: string};
  MyServices: undefined;
  MySchedule: undefined;
  MyReviews: undefined;
  NotificationSettings: undefined;
  PaymentUPI: undefined;
  PendingApprovals: undefined;
  LocationMap: undefined;
  ForgotPassword: undefined;
  PreArrivalChat: {bookingId: string; customerName?: string};
};

export type MainTabParamList = {
  Dashboard: undefined;
  Queue: undefined;
  Bookings: undefined;
  AnalyticsTab: undefined;
  Profile: undefined;
};

export type OwnerDrawerParamList = {
  Dashboard: undefined;
  Staff: undefined;
  Shop: undefined;
  Payments: undefined;
  Settings: undefined;
  WhatsAppOnboarding: undefined;
};

export type StaffTabParamList = {
  Dashboard: undefined;
  Services: undefined;
  Queue: undefined;
  Reviews: undefined;
  Settings: undefined;
};

// Data Types
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'STAFF';
  shops?: Shop[];
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  photos?: ShopPhoto[];
  services?: Service[];
  workingHours?: WorkingHours;
}

export interface ShopPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  category?: string;
  imageUrl?: string;
}

export interface WorkingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  verificationCode: string;
  startTime: string;
  endTime: string;
  serviceAmount: number;
  displayAmount: number;
  freeCashUsed: number;
  freeCashEarned: number;
  paymentType: 'PAY_LATER' | 'ONLINE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  shop?: {
    id: string;
    name: string;
  };
  services?: BookingService[];
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  booking?: {
    id: string;
    bookingNumber?: string;
    services?: Array<{
      serviceName: string;
    }>;
  };
}

export interface StaffReviewsResponse {
  data: ReviewItem[];
  stats: {
    averageRating: number;
    totalReviews: number;
    distribution: Record<number, number>;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TrackableBooking extends Booking {
  location?: {
    lat: number;
    lng: number;
  } | null;
}

export interface QueueChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderType: 'USER' | 'SHOP';
  content: string;
  createdAt: string;
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface BookingService {
  id: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
}

export interface DashboardStats {
  todayStats: {
    total: number;
    completed: number;
    upcoming: number;
    inProgress: number;
    noShow: number;
    revenue: number;
  };
  yesterdayStats: {
    total: number;
    revenue: number;
  };
  weeklyStats: Record<string, number>;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  role: 'OWNER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
}

// Form Types
export interface ServiceFormData {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category?: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface ShopFormData {
  name: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
}
