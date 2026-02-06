// ============================================================================
// User Roles
// ============================================================================

export enum UserRole {
  USER = 'USER',
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// ============================================================================
// Tenant Types
// ============================================================================

export enum TenantType {
  CLINIC = 'CLINIC',
  SALON = 'SALON',
  BARBER = 'BARBER',
  SPA = 'SPA',
  OTHER = 'OTHER',
}

export enum TenantPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

// ============================================================================
// Booking Status
// ============================================================================

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  REJECTED = 'REJECTED',
}

export enum BookingSource {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  WALK_IN = 'WALK_IN',
  ADMIN = 'ADMIN',
}

// ============================================================================
// Payment
// ============================================================================

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  CASH = 'CASH',
}

// ============================================================================
// Notifications
// ============================================================================

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  TURN_NOTIFICATION = 'TURN_NOTIFICATION',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

// ============================================================================
// Days
// ============================================================================

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}
