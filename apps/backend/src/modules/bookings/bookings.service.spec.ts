import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { QueueGateway } from '../queue/queue.gateway';
import { QueueTrackingService } from '../queue/queue-tracking.service';
import { SlotEngineService } from '../queue/slot-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustScoreService } from '../users/trust-score.service';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';
import { WalletService } from '../wallet/wallet.service';
import { BookingStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    shop: {
      findUnique: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    staff: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockRedisService = {
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
  };
  const mockQueueService = {
    getQueuePosition: jest.fn().mockResolvedValue(0),
    getNextQueuePosition: jest.fn().mockResolvedValue(0),
    updateQueueStats: jest.fn().mockResolvedValue(true),
    invalidateSlotCache: jest.fn().mockResolvedValue(true),
  };
  const mockQueueGateway = {
    emitQueueUpdate: jest.fn().mockResolvedValue(true),
    emitBookingUpdate: jest.fn().mockResolvedValue(true),
  };
  const mockQueueTrackingService = {
    saveLocation: jest.fn().mockResolvedValue(true),
  };
  const mockSlotEngineService = {
    isSlotAvailable: jest.fn().mockResolvedValue(true),
  };
  const mockNotificationsService = {
    sendBookingConfirmation: jest.fn().mockResolvedValue(true),
    send: jest.fn().mockResolvedValue(true),
  };
  const mockTrustScoreService = {
    getUserTrustScore: jest.fn().mockResolvedValue(100),
    processCompletedBooking: jest.fn().mockResolvedValue(true),
    processNoShow: jest.fn().mockResolvedValue(true),
    processCancellation: jest.fn().mockResolvedValue(true),
  };
  const mockFraudDetectionService = {
    checkBookingForFraud: jest.fn().mockResolvedValue({ allowed: true, flags: [], score: 0 }),
  };
  const mockWalletService = {
    getOrCreateWallet: jest.fn().mockResolvedValue({
      id: 'wallet-1',
      balance: { toNumber: () => 0 },
      freeCashBalance: { toNumber: () => 0 },
    }),
    deductFromWallet: jest.fn().mockResolvedValue(true),
    calculateFreeCashAmount: jest.fn().mockReturnValue(25),
    hasReferralBonus: jest.fn().mockReturnValue(false),
    creditFreeCash: jest.fn().mockResolvedValue({ wallet: {}, transaction: {} }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: QueueGateway, useValue: mockQueueGateway },
        { provide: QueueTrackingService, useValue: mockQueueTrackingService },
        { provide: SlotEngineService, useValue: mockSlotEngineService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: TrustScoreService, useValue: mockTrustScoreService },
        { provide: FraudDetectionService, useValue: mockFraudDetectionService },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create booking', () => {
    it('should calculate totalAmount correctly with multiple services and apply offer codes', async () => {
      // Arrange
      const shopId = 'shop-123';
      const serviceIds = ['srv-1', 'srv-2'];
      const startTime = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: shopId,
        autoAcceptBookings: false,
      });

      mockPrismaService.service.findMany.mockResolvedValue([
        { id: 'srv-1', name: 'Haircut', durationMinutes: 30, price: 500, currency: 'INR' },
        { id: 'srv-2', name: 'Beard Trim', durationMinutes: 15, price: 200, currency: 'INR' },
      ]);

      mockPrismaService.booking.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'booking-1',
          ...args.data,
          services: [{ serviceName: 'Haircut' }, { serviceName: 'Beard Trim' }],
        }),
      );

      // Act
      const result = await service.create({
        shopId,
        serviceIds,
        startTime,
        customerName: 'Test Customer',
        customerPhone: '1234567890',
      });

      // Assert - totalAmount includes free cash (25) added by wallet service
      expect(result.totalDurationMinutes).toBe(45);
      expect(Number(result.totalAmount)).toBe(700); // 700 base (free cash not added to totalAmount)
      expect(result.status).toBe(BookingStatus.PENDING_APPROVAL);
    });

    it('should apply OVERLINE10 offer code correctly (10% off)', async () => {
      const shopId = 'shop-123';
      const serviceIds = ['srv-1'];
      const startTime = new Date(Date.now() + 86400000).toISOString();

      mockPrismaService.shop.findUnique.mockResolvedValue({
        id: shopId,
        autoAcceptBookings: false,
      });

      mockPrismaService.service.findMany.mockResolvedValue([
        { id: 'srv-1', name: 'Premium Service', durationMinutes: 60, price: 1000, currency: 'INR' },
      ]);

      mockPrismaService.booking.create.mockImplementation((args) =>
        Promise.resolve({
          ...args.data,
          services: [{ serviceName: 'Premium Service' }],
        }),
      );

      const result = await service.create({
        shopId,
        serviceIds,
        startTime,
        customerName: 'Test Customer',
        offerCode: 'OVERLINE10',
      });

      expect(Number(result.totalAmount)).toBe(900); // 900 (1000 - 10%) (free cash not added to totalAmount)
    });
  });

  describe('handleCallAheadReply', () => {
    it('keeps status unchanged for COMING and does not promote waitlisted', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValueOnce({
        id: 'booking-1',
        shopId: 'shop-1',
        staffProfileId: 'sp-1',
        slotDate: '2026-04-03',
        slotTime: '13:00',
      });
      mockPrismaService.booking.update.mockResolvedValueOnce({
        id: 'booking-1',
        shopId: 'shop-1',
        callAheadReply: 'COMING',
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.handleCallAheadReply('booking-1', 'user-1', 'COMING');

      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { callAheadReply: 'COMING' },
      });
      expect(mockQueueService.updateQueueStats).toHaveBeenCalledWith('shop-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'booking-1', callAheadReply: 'COMING' }),
      );
      expect(mockPrismaService.booking.findFirst).toHaveBeenCalledTimes(1);
    });

    it('marks booking skipped and promotes next waitlisted for NOT_COMING', async () => {
      mockPrismaService.booking.findFirst
        .mockResolvedValueOnce({
          id: 'booking-1',
          shopId: 'shop-1',
          staffProfileId: 'sp-1',
          slotDate: '2026-04-03',
          slotTime: '13:00',
        })
        .mockResolvedValueOnce({ id: 'booking-2' });

      mockPrismaService.booking.update
        .mockResolvedValueOnce({
          id: 'booking-1',
          shopId: 'shop-1',
          callAheadReply: 'NOT_COMING',
          status: BookingStatus.SKIPPED,
        })
        .mockResolvedValueOnce({
          id: 'booking-2',
          status: BookingStatus.PENDING_APPROVAL,
          queuePosition: null,
        });

      const result = await service.handleCallAheadReply('booking-1', 'user-1', 'NOT_COMING');

      expect(mockPrismaService.booking.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'booking-1' },
        data: {
          callAheadReply: 'NOT_COMING',
          status: BookingStatus.SKIPPED,
        },
      });

      expect(mockPrismaService.booking.findFirst).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            staffProfileId: 'sp-1',
            slotDate: '2026-04-03',
            slotTime: '13:00',
            status: BookingStatus.WAITLISTED,
          },
          orderBy: { queuePosition: 'asc' },
        }),
      );

      expect(mockPrismaService.booking.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'booking-2' },
        data: {
          status: BookingStatus.PENDING_APPROVAL,
          queuePosition: null,
        },
      });
      expect(mockQueueService.updateQueueStats).toHaveBeenCalledWith('shop-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'booking-1', status: BookingStatus.SKIPPED }),
      );
    });

    it('marks booking skipped for LATER and does not fail when no waitlisted booking exists', async () => {
      mockPrismaService.booking.findFirst
        .mockResolvedValueOnce({
          id: 'booking-1',
          shopId: 'shop-1',
          staffProfileId: 'sp-1',
          slotDate: '2026-04-03',
          slotTime: '13:00',
        })
        .mockResolvedValueOnce(null);

      mockPrismaService.booking.update.mockResolvedValueOnce({
        id: 'booking-1',
        shopId: 'shop-1',
        callAheadReply: 'LATER',
        status: BookingStatus.SKIPPED,
      });

      const result = await service.handleCallAheadReply('booking-1', 'user-1', 'LATER');

      expect(mockPrismaService.booking.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: {
          callAheadReply: 'LATER',
          status: BookingStatus.SKIPPED,
        },
      });
      expect(mockQueueService.updateQueueStats).toHaveBeenCalledWith('shop-1');
      expect(result).toEqual(
        expect.objectContaining({ id: 'booking-1', callAheadReply: 'LATER' }),
      );
    });

    it('throws NotFoundException when booking is not owned by user', async () => {
      mockPrismaService.booking.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.handleCallAheadReply('missing-booking', 'user-1', 'COMING'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockPrismaService.booking.update).not.toHaveBeenCalled();
      expect(mockQueueService.updateQueueStats).not.toHaveBeenCalled();
    });
  });
});
