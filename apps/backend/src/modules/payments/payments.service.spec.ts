import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    earning: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    staffProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'payments.razorpay.keySecret') return 'rzp_secret';
      if (key === 'payments.razorpay.keyId') return 'rzp_key';
      if (key === 'payments.razorpay.routeEnabled') return false;
      if (key === 'payments.razorpay.accountNumber') return null;
      if (key === 'payments.fees.platformFeePercent') return 2;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should throw if booking does not exist', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);
      await expect(service.createPaymentIntent({ bookingId: 'b-1' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if payment already completed', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        id: 'b-1',
        userId: 'user-1',
        payment: { status: PaymentStatus.COMPLETED },
      });
      await expect(service.createPaymentIntent({ bookingId: 'b-1' }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyRazorpayPayment', () => {
    const validPayload = {
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: '',
    };

    beforeEach(() => {
      const crypto = require('crypto');
      validPayload.razorpay_signature = crypto
        .createHmac('sha256', 'rzp_secret')
        .update(`${validPayload.razorpay_order_id}|${validPayload.razorpay_payment_id}`)
        .digest('hex');
    });

    it('creates earning snapshots after successful online verification', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        bookingId: 'booking-1',
        booking: { id: 'booking-1' },
      });
      mockPrismaService.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        bookingNumber: 'BK-1',
        shopId: 'shop-1',
        staffProfileId: 'sp-1',
        paymentType: 'PREPAID',
        serviceAmount: { toNumber: () => 500 },
        totalAmount: { toNumber: () => 500 },
      });

      await service.verifyRazorpayPayment(validPayload);

      expect(mockPrismaService.earning.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            bookingId: 'booking-1',
            amount: 50000,
            platformFee: 1000,
            netAmount: 49000,
          }),
        }),
      );
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking-1' },
          data: expect.objectContaining({
            platformFee: 1000,
            staffEarning: 49000,
          }),
        }),
      );
    });

    it('keeps earning unsettled in fallback mode when route disabled', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        bookingId: 'booking-1',
        booking: { id: 'booking-1' },
      });
      mockPrismaService.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        bookingNumber: 'BK-1',
        shopId: 'shop-1',
        staffProfileId: 'sp-1',
        paymentType: 'PREPAID',
        serviceAmount: { toNumber: () => 250 },
        totalAmount: { toNumber: () => 250 },
      });

      await service.verifyRazorpayPayment(validPayload);

      expect(mockPrismaService.earning.update).not.toHaveBeenCalled();
    });
  });
});
