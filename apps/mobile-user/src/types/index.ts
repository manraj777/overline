// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'USER' | 'OWNER' | 'STAFF' | 'ADMIN';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt: string;
}

// Shop types
export interface Shop {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  photoUrl?: string;
  coverPhotoUrl?: string;
  isOpen: boolean;
  distance?: number;
  services?: Service[];
  workingHours?: WorkingHours[];
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category?: string;
  isActive: boolean;
}

export interface WorkingHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

// Booking types
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ServiceStatus =
  | 'AWAITING_CODE'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentType = 'PREPAID' | 'PAY_LATER' | 'FREE';

export interface Booking {
  id: string;
  bookingNumber: string;
  shopId: string;
  userId?: string;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  totalAmount: string;
  serviceAmount: string;
  freeCashAmount: string;
  displayAmount: string;
  paymentType: PaymentType;
  status: BookingStatus;
  serviceStatus: ServiceStatus;
  verificationCode: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  queuePosition: number;
  createdAt: string;
  services: BookingService[];
  shop: {
    name: string;
    address: string;
    phone?: string;
  };
  user?: User;
}

export interface BookingService {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: string;
}

// Wallet types
export interface WalletBalance {
  balance: number;
  pendingCredits: number;
  lifetimeEarnings: number;
}

export interface WalletTransaction {
  id: string;
  type: 'FREE_CASH_CREDIT' | 'FREE_CASH_DEBIT' | 'FREE_CASH_RETURN' | 'REFUND' | 'REWARD' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT';
  amount: number;
  description: string;
  bookingId?: string;
  createdAt: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  RegisterPhone: {name: string; email: string; password: string};
  RegisterOtp: {name: string; email: string; password: string; phone: string};
  RegisterProfile: {name: string; email: string; password: string; phone: string};
  OtpVerify: {phone: string};
  Main: undefined;
  ShopDetail: {shopId: string};
  BookingStaff: {shopId: string; selectedServices: string[]};
  Booking: {shopId: string; selectedServices?: string[]; selectedStaffId?: string};
  BookingReview: {
    shopId: string;
    selectedServices: string[];
    selectedDate: string;
    selectedTime: string;
    selectedStaffId?: string;
  };
  BookingDetail: {bookingId: string};
  BookingConfirmation: {bookingId: string};
  EditProfile: undefined;
  PhoneVerification: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  MyBookings: undefined;
  Chat: undefined;
  Profile: undefined;
};
