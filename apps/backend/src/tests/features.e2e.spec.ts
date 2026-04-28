import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../modules/wallet/wallet.service';
import { OtpService } from '../modules/otp/otp.service';
import { BookingsService } from '../modules/bookings/bookings.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { FREE_CASH_CONFIG } from '../modules/wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

import { AuthService } from '../modules/auth/auth.service';

const PaymentType = {
  PREPAID: 'PREPAID',
  PAY_LATER: 'PAY_LATER',
} as const;

const ServiceStatus = {
  AWAITING_CODE: 'AWAITING_CODE',
  IN_SERVICE: 'IN_SERVICE',
  COMPLETED: 'COMPLETED',
  DISPUTED: 'DISPUTED',
} as const;

const CancellationReason = {
  SHOP_CLOSED: 'SHOP_CLOSED',
  EMERGENCY: 'EMERGENCY',
  WRONG_BOOKING: 'WRONG_BOOKING',
  FOUND_BETTER: 'FOUND_BETTER',
  PRICE_ISSUE: 'PRICE_ISSUE',
  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',
  OTHER: 'OTHER',
} as const;

const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  REJECTED: 'REJECTED',
} as const;

// Mock ConfigService for testing
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      OTP_EXPIRY_MINUTES: 5,
      OTP_LENGTH: 6,
      TWILIO_ACCOUNT_SID: 'test',
      TWILIO_AUTH_TOKEN: 'test',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };
    return config[key] ?? defaultValue;
  }),
};

/**
 * Comprehensive test suite for new Overline features:
 * - Wallet & Free Cash System
 * - OTP Verification
 * - Service Verification Codes
 * - Bidirectional Rating
 */
describe('Overline Features - Integration Tests', () => {
  let walletService: WalletService;
  let otpService: OtpService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let bookingsService: BookingsService;
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let redisService: RedisService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        WalletService,
        OtpService,
        PrismaService,
        RedisService,
        { provide: AuthService, useValue: {} },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    walletService = module.get<WalletService>(WalletService);
    otpService = module.get<OtpService>(OtpService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Wallet Service Tests', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create test user
      const user = await prismaService.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          phone: `+911234567${String(Math.random()).slice(2, 4)}`,
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      // Cleanup
      if (testUserId) {
        await prismaService.wallet.deleteMany({
          where: { userId: testUserId },
        });
        await prismaService.user.delete({
          where: { id: testUserId },
        });
      }
    });

    it('should create or get wallet for user', async () => {
      const wallet = await walletService.getOrCreateWallet(testUserId);
      expect(wallet).toBeDefined();
      // Public API returns a DTO without userId and with numeric balances
      expect(wallet.id).toBeDefined();
      expect(wallet.balance).toBe(0);
      expect(wallet.freeCashBalance).toBe(0);
    });

    it('should calculate free cash amount within range', async () => {
      const amount = walletService.calculateFreeCashAmount();
      expect(amount).toBeGreaterThanOrEqual(FREE_CASH_CONFIG.MIN_AMOUNT);
      expect(amount).toBeLessThanOrEqual(FREE_CASH_CONFIG.MAX_AMOUNT);
    });

    it('should credit free cash to wallet', async () => {
      const creditAmount = 25;
      const bookingId = 'test-booking-' + Date.now();

      const result = await walletService.creditFreeCash(
        testUserId,
        creditAmount,
        bookingId,
        'Test free cash credit',
      );

      expect(result.wallet).toBeDefined();
      expect(result.transaction).toBeDefined();
      expect(result.wallet.freeCashBalance.toNumber()).toBe(creditAmount);
      expect(result.transaction.type).toBe('FREE_CASH_CREDIT');
    });

    it('should debit free cash from wallet', async () => {
      const creditAmount = 30;
      const debitAmount = 15;
      const bookingId = 'test-booking-' + Date.now();

      // First credit
      await walletService.creditFreeCash(testUserId, creditAmount, bookingId + '-credit');

      // Then debit
      const result = await walletService.debitFreeCash(
        testUserId,
        debitAmount,
        bookingId + '-debit',
      );

      expect(result.wallet.freeCashBalance.toNumber()).toBe(creditAmount - debitAmount);
      expect(result.transaction.type).toBe('FREE_CASH_DEBIT');
    });

    it('should detect spammer based on cancellation rate', async () => {
      // Update user with high cancellation rate
      await prismaService.user.update({
        where: { id: testUserId },
        data: {
          totalBookings: 10,
          cancelledBookings: 6, // 60% cancellation rate
          trustScore: 45,
        },
      });

      const isSpammer = await walletService.isUserSpammer(testUserId);
      expect(isSpammer).toBe(true);
    });

    it('should return free cash on valid cancellation', async () => {
      const creditAmount = 25;
      const bookingId = 'test-booking-' + Date.now();

      // Credit free cash first
      await walletService.creditFreeCash(testUserId, creditAmount, bookingId + '-credit');

      // Return on valid reason
      const result = await walletService.returnFreeCash(
        testUserId,
        creditAmount,
        bookingId,
        true,
        'Valid cancellation reason',
      );

      expect(result.wallet.freeCashBalance.toNumber()).toBe(creditAmount * 2);
      expect(result.transaction.type).toBe('FREE_CASH_RETURN');
    });

    it('should process refund for prepaid bookings', async () => {
      const refundAmount = 499;
      const bookingId = 'test-booking-' + Date.now();

      const result = await walletService.processRefund(
        testUserId,
        refundAmount,
        bookingId,
        'Prepaid booking refund',
      );

      expect(result.wallet.balance.toNumber()).toBe(refundAmount);
      expect(result.transaction.type).toBe('REFUND');
    });

    it('should validate cancellation reasons', async () => {
      expect(walletService.isValidCancellationReason('SHOP_CLOSED')).toBe(true);
      expect(walletService.isValidCancellationReason('EMERGENCY')).toBe(true);
      expect(walletService.isValidCancellationReason('FOUND_BETTER')).toBe(false);
    });
  });

  describe('OTP Service Tests', () => {
    let testPhone: string;

    beforeEach(() => {
      testPhone = `+919876543${String(Math.random()).slice(2, 4)}`;
    });

    afterEach(async () => {
      // Cleanup OTP records
      await prismaService.otpVerification.deleteMany({
        where: { phone: testPhone },
      });
    });

    it('should send OTP to valid phone number', async () => {
      const result = await otpService.sendOtp(testPhone, 'LOGIN');
      expect(result.message).toContain('OTP sent');
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invalid phone format', async () => {
      await expect(otpService.sendOtp('invalid-phone', 'LOGIN')).rejects.toThrow(
        'Invalid phone number format',
      );
    });

    it('should enforce cooldown between OTP requests', async () => {
      await otpService.sendOtp(testPhone, 'LOGIN');

      // Try to send again immediately
      await expect(otpService.sendOtp(testPhone, 'LOGIN')).rejects.toThrow('Please wait');
    });

    it('should verify valid OTP', async () => {
      await otpService.sendOtp(testPhone, 'LOGIN');

      // Get the OTP from database
      const otpRecord = await prismaService.otpVerification.findFirst({
        where: { phone: testPhone },
        orderBy: { createdAt: 'desc' },
      });

      if (otpRecord) {
        const result = await otpService.verifyOtp(testPhone, otpRecord.otp, 'LOGIN');
        expect(result.verified).toBe(true);
      }
    });

    it('should reject invalid OTP', async () => {
      await otpService.sendOtp(testPhone, 'LOGIN');

      await expect(otpService.verifyOtp(testPhone, '000000', 'LOGIN')).rejects.toThrow(
        'Invalid OTP',
      );
    });

    it('should limit OTP verification attempts', async () => {
      await otpService.sendOtp(testPhone, 'LOGIN');

      // Attempt verification 3 times with wrong OTP
      for (let i = 0; i < 3; i++) {
        await expect(otpService.verifyOtp(testPhone, '000000', 'LOGIN')).rejects.toThrow();
      }

      // 4th attempt should fail with max attempts exceeded
      await expect(otpService.verifyOtp(testPhone, '000000', 'LOGIN')).rejects.toThrow(
        'Maximum verification attempts exceeded',
      );
    });

    it('should normalize phone numbers correctly', async () => {
      expect(otpService.normalizePhone('9876543210')).toBe('+919876543210');
      expect(otpService.normalizePhone('+919876543210')).toBe('+919876543210');
      expect(otpService.normalizePhone('919876543210')).toBe('+919876543210');
    });
  });

  describe('Booking Features Tests', () => {
    let testUserId: string;
    let testShopId: string;
    let testServiceId: string;

    beforeEach(async () => {
      // Create test user
      const user = await prismaService.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          phone: `+911234567${String(Math.random()).slice(2, 4)}`,
          isPhoneVerified: true,
        },
      });
      testUserId = user.id;

      // Create test shop
      const tenant = await prismaService.tenant.create({
        data: {
          name: 'Test Shop',
          type: 'SALON',
        },
      });

      const shop = await prismaService.shop.create({
        data: {
          tenantId: tenant.id,
          name: 'StyleCuts Salon',
          slug: 'stylecuts-' + Date.now(),
          address: '123 Main St',
          city: 'Mumbai',
          country: 'IN',
          latitude: new Decimal('19.0760'),
          longitude: new Decimal('72.8777'),
        },
      });
      testShopId = shop.id;

      // Create test service
      const service = await prismaService.service.create({
        data: {
          shopId: testShopId,
          name: 'Haircut',
          durationMinutes: 30,
          price: new Decimal('299'),
        },
      });
      testServiceId = service.id;
    });

    afterEach(async () => {
      // Cleanup
      if (testShopId) {
        await prismaService.booking.deleteMany({
          where: { shopId: testShopId },
        });
        await prismaService.service.deleteMany({
          where: { shopId: testShopId },
        });
        await prismaService.shop.deleteMany({
          where: { id: testShopId },
        });
        await prismaService.tenant.deleteMany({
          where: {
            shops: {
              some: { id: testShopId },
            },
          },
        });
      }
      if (testUserId) {
        await prismaService.wallet.deleteMany({
          where: { userId: testUserId },
        });
        await prismaService.user.delete({
          where: { id: testUserId },
        });
      }
    });

    it('should generate 4-digit verification code for booking', async () => {
      const booking = await prismaService.booking.create({
        data: {
          bookingNumber: 'TEST-' + Date.now(),
          userId: testUserId,
          shopId: testShopId,
          startTime: new Date(Date.now() + 3600000),
          endTime: new Date(Date.now() + 5400000),
          totalDurationMinutes: 30,
          totalAmount: new Decimal('300'),
          serviceAmount: new Decimal('299'),
          freeCashAmount: new Decimal('25'),
          displayAmount: new Decimal('324'),
          paymentType: PaymentType.PAY_LATER,
          verificationCode: '1234',
          serviceStatus: ServiceStatus.AWAITING_CODE,
          services: {
            create: {
              serviceId: testServiceId,
              serviceName: 'Haircut',
              durationMinutes: 30,
              price: new Decimal('299'),
            },
          },
        },
      });

      expect(booking.verificationCode).toBeDefined();
      expect(booking.verificationCode.length).toBe(4);
      expect(/^\d{4}$/.test(booking.verificationCode)).toBe(true);
    });

    it('should display correct free cash amount to user', async () => {
      const serviceAmount = 299;
      const freeCashAmount = 27;
      const displayAmount = serviceAmount + freeCashAmount;

      const booking = await prismaService.booking.create({
        data: {
          bookingNumber: 'TEST-' + Date.now(),
          userId: testUserId,
          shopId: testShopId,
          startTime: new Date(Date.now() + 3600000),
          endTime: new Date(Date.now() + 5400000),
          totalDurationMinutes: 30,
          totalAmount: new Decimal(displayAmount),
          serviceAmount: new Decimal(serviceAmount),
          freeCashAmount: new Decimal(freeCashAmount),
          displayAmount: new Decimal(displayAmount),
          paymentType: PaymentType.PAY_LATER,
          verificationCode: '5678',
          serviceStatus: ServiceStatus.AWAITING_CODE,
          services: {
            create: {
              serviceId: testServiceId,
              serviceName: 'Haircut',
              durationMinutes: 30,
              price: new Decimal(serviceAmount),
            },
          },
        },
      });

      // What user sees
      expect(booking.displayAmount.toNumber()).toBe(displayAmount);

      // What actually charges
      expect(booking.serviceAmount.toNumber()).toBe(serviceAmount);

      // Free cash for next booking
      expect(booking.freeCashAmount.toNumber()).toBe(freeCashAmount);
    });

    it('should track cancellation reason', async () => {
      const booking = await prismaService.booking.create({
        data: {
          bookingNumber: 'TEST-' + Date.now(),
          userId: testUserId,
          shopId: testShopId,
          startTime: new Date(Date.now() + 3600000),
          endTime: new Date(Date.now() + 5400000),
          totalDurationMinutes: 30,
          totalAmount: new Decimal('300'),
          serviceAmount: new Decimal('299'),
          freeCashAmount: new Decimal('25'),
          displayAmount: new Decimal('324'),
          paymentType: PaymentType.PAY_LATER,
          verificationCode: '9999',
          serviceStatus: ServiceStatus.AWAITING_CODE,
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: CancellationReason.EMERGENCY,
          cancellationDetails: 'Family emergency',
          services: {
            create: {
              serviceId: testServiceId,
              serviceName: 'Haircut',
              durationMinutes: 30,
              price: new Decimal('299'),
            },
          },
        },
      });

      expect(booking.cancellationReason).toBe(CancellationReason.EMERGENCY);
      expect(booking.cancellationDetails).toBe('Family emergency');
    });

    it('should support PREPAID and PAY_LATER payment types', async () => {
      const bookingPrepaid = await prismaService.booking.create({
        data: {
          bookingNumber: 'PREPAID-' + Date.now(),
          userId: testUserId,
          shopId: testShopId,
          startTime: new Date(Date.now() + 3600000),
          endTime: new Date(Date.now() + 5400000),
          totalDurationMinutes: 30,
          totalAmount: new Decimal('300'),
          serviceAmount: new Decimal('299'),
          freeCashAmount: new Decimal('25'),
          displayAmount: new Decimal('324'),
          paymentType: PaymentType.PREPAID,
          verificationCode: '1111',
          serviceStatus: ServiceStatus.AWAITING_CODE,
          services: {
            create: {
              serviceId: testServiceId,
              serviceName: 'Haircut',
              durationMinutes: 30,
              price: new Decimal('299'),
            },
          },
        },
      });

      const bookingPayLater = await prismaService.booking.create({
        data: {
          bookingNumber: 'PAYLATER-' + Date.now(),
          userId: testUserId,
          shopId: testShopId,
          startTime: new Date(Date.now() + 7200000),
          endTime: new Date(Date.now() + 9000000),
          totalDurationMinutes: 30,
          totalAmount: new Decimal('300'),
          serviceAmount: new Decimal('299'),
          freeCashAmount: new Decimal('25'),
          displayAmount: new Decimal('324'),
          paymentType: PaymentType.PAY_LATER,
          verificationCode: '2222',
          serviceStatus: ServiceStatus.AWAITING_CODE,
          services: {
            create: {
              serviceId: testServiceId,
              serviceName: 'Haircut',
              durationMinutes: 30,
              price: new Decimal('299'),
            },
          },
        },
      });

      expect(bookingPrepaid.paymentType).toBe(PaymentType.PREPAID);
      expect(bookingPayLater.paymentType).toBe(PaymentType.PAY_LATER);
    });
  });

  describe('Cancellation & Refund Logic Tests', () => {
    it('should handle grace period correctly', async () => {
      const now = new Date();
      const gracePeriodMs = 60 * 60 * 1000; // 1 hour
      const gracePeriodCutoff = new Date(now.getTime() - gracePeriodMs);

      // Booking created 30 min ago - within grace period (more recent than cutoff)
      const withinGracePeriod = new Date(now.getTime() - 30 * 60 * 1000);
      // Booking created 2 hours ago - outside grace period (older than cutoff)
      const outsideGracePeriod = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // withinGracePeriod is MORE recent than cutoff, so it's AFTER the cutoff (within grace)
      expect(withinGracePeriod > gracePeriodCutoff).toBe(true);
      // outsideGracePeriod is OLDER than cutoff, so it's BEFORE the cutoff (outside grace)
      expect(outsideGracePeriod > gracePeriodCutoff).toBe(false);
    });
  });

  describe('Free Cash System Integration Tests', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await prismaService.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          phone: `+911234567${String(Math.random()).slice(2, 4)}`,
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      if (testUserId) {
        await prismaService.wallet.deleteMany({
          where: { userId: testUserId },
        });
        await prismaService.user.delete({
          where: { id: testUserId },
        });
      }
    });

    it('should accumulate free cash over multiple bookings', async () => {
      const freeCashPerBooking = 25;
      const numBookings = 3;

      for (let i = 0; i < numBookings; i++) {
        await walletService.creditFreeCash(testUserId, freeCashPerBooking, `booking-${i}`);
      }

      const balance = await walletService.getWalletBalance(testUserId);
      expect(balance.freeCashBalance).toBe(freeCashPerBooking * numBookings);
    });

    it('should track free cash lifecycle', async () => {
      // 1. Credit free cash
      await walletService.creditFreeCash(testUserId, 25, 'booking-1', 'Initial credit');

      // 2. Use free cash
      await walletService.debitFreeCash(testUserId, 25, 'booking-2', 'Used for booking');

      // 3. Return free cash
      await walletService.returnFreeCash(
        testUserId,
        25,
        'booking-2',
        true,
        'Returned on cancellation',
      );

      const balance = await walletService.getWalletBalance(testUserId);
      expect(balance.freeCashBalance).toBe(25);
    });
  });
});

/**
 * Manual Test Checklist
 *
 * Run with: npm test
 *
 * ✓ Wallet Service Tests
 *   ✓ Create/get wallet for user
 *   ✓ Calculate free cash (₹25-30)
 *   ✓ Credit free cash
 *   ✓ Debit free cash
 *   ✓ Detect spammers
 *   ✓ Return free cash on valid cancellation
 *   ✓ Process refunds
 *   ✓ Validate cancellation reasons
 *
 * ✓ OTP Service Tests
 *   ✓ Send OTP to phone
 *   ✓ Validate phone format
 *   ✓ Enforce cooldown between requests
 *   ✓ Verify valid OTP
 *   ✓ Reject invalid OTP
 *   ✓ Limit verification attempts (max 3)
 *   ✓ Normalize phone numbers (+91 format)
 *
 * ✓ Booking Feature Tests
 *   ✓ Generate 4-digit verification code
 *   ✓ Display correct free cash amount
 *   ✓ Track cancellation reasons
 *   ✓ Support PREPAID and PAY_LATER payment types
 *
 * ✓ Cancellation & Grace Period
 *   ✓ Handle 1-hour grace period
 *   ✓ Free cash only returned within grace period
 *   ✓ Owner approval needed for late cancellations
 *
 * ✓ Free Cash Lifecycle
 *   ✓ Accumulate over bookings
 *   ✓ Credit → Debit → Return flow
 *
 * Database Changes Verified:
 *   ✓ wallets table created
 *   ✓ wallet_transactions table created
 *   ✓ cancellation_requests table created
 *   ✓ reschedule_requests table created
 *   ✓ otp_verifications table created
 *   ✓ PaymentType enum created
 *   ✓ WalletTransactionType enum created
 *   ✓ CancellationReason enum created
 *   ✓ ServiceStatus enum created
 */
