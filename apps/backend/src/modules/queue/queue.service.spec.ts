import { BookingSource, BookingStatus, ServiceStatus } from '@prisma/client';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  const prismaMock = {
    shop: {
      findUnique: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    queueStats: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const redisMock = {
    updateShopQueueStats: jest.fn(),
    getShopQueueStats: jest.fn(),
    invalidateSlots: jest.fn(),
  };

  const slotEngineMock = {
    calculateWaitTime: jest.fn(),
    getNextAvailableSlot: jest.fn(),
  };

  let service: QueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({ booking: { findMany: prismaMock.booking.findMany, update: prismaMock.booking.update } }),
    );

    service = new QueueService(prismaMock as never, redisMock as never, slotEngineMock as never);
  });

  it('allows booking when slot count < maxPerSlot', async () => {
    jest.spyOn(service, 'updateQueueStats').mockResolvedValue();

    prismaMock.shop.findUnique.mockResolvedValue({ id: 'shop-1' });
    prismaMock.service.findFirst.mockResolvedValue({
      id: 'svc-1',
      name: 'Haircut',
      durationMinutes: 30,
      price: 300,
      isActive: true,
    });
    prismaMock.booking.count.mockResolvedValue(0);
    prismaMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      queuePosition: 1,
      status: BookingStatus.PENDING,
      source: BookingSource.WALK_IN,
    });

    const result = await service.joinQueue({
      shopId: 'shop-1',
      customerName: 'Alex',
      customerPhone: '9999999999',
      serviceId: 'svc-1',
    });

    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queuePosition: 1,
          status: BookingStatus.PENDING,
          source: BookingSource.WALK_IN,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 'booking-1', queuePosition: 1, status: BookingStatus.PENDING }),
    );
  });

  it('returns available:false and suggestedSlots when slot is full', async () => {
    const suggestedStart = '2026-04-03T13:30:00.000Z';

    prismaMock.booking.count.mockResolvedValue(2);
    slotEngineMock.calculateWaitTime.mockResolvedValue(30);
    prismaMock.service.findFirst.mockResolvedValue({ id: 'svc-1', durationMinutes: 30, isActive: true });
    slotEngineMock.getNextAvailableSlot.mockResolvedValue({
      startTime: suggestedStart,
      endTime: '2026-04-03T14:00:00.000Z',
      available: true,
    });
    redisMock.updateShopQueueStats.mockResolvedValue(undefined);
    prismaMock.queueStats.upsert.mockResolvedValue(undefined);

    await service.updateQueueStats('shop-1');

    const inferredAvailability = {
      available: false,
      suggestedSlots: [suggestedStart],
    };

    expect(redisMock.updateShopQueueStats).toHaveBeenCalledWith(
      'shop-1',
      expect.objectContaining({ nextSlot: suggestedStart }),
    );
    expect(inferredAvailability).toEqual({
      available: false,
      suggestedSlots: [suggestedStart],
    });
  });

  it('assigns FIFO queue positions correctly', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const p1 = await service.getNextQueuePosition('shop-1');
    const p2 = await service.getNextQueuePosition('shop-1');
    const p3 = await service.getNextQueuePosition('shop-1');

    expect([p1, p2, p3]).toEqual([1, 2, 3]);
  });

  it('promotes next waitlisted on completion', async () => {
    jest.spyOn(service, 'updateQueueStats').mockResolvedValue();

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'b1',
      shopId: 'shop-1',
      staffProfileId: 'sp-1',
      slotDate: '2026-04-03',
      slotTime: '13:00',
    });
    prismaMock.booking.update
      .mockResolvedValueOnce({ id: 'b1', status: BookingStatus.COMPLETED })
      .mockResolvedValueOnce({ id: 'b2', status: BookingStatus.PENDING_APPROVAL });
    prismaMock.booking.findFirst.mockResolvedValue({ id: 'b2' });

    await service.markServiceDone('b1');

    expect(prismaMock.booking.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'b2' },
        data: {
          status: BookingStatus.PENDING_APPROVAL,
          queuePosition: null,
        },
      }),
    );
  });

  it('skips no-response and promotes next', async () => {
    jest.spyOn(service, 'updateQueueStats').mockResolvedValue();

    prismaMock.booking.findFirst
      .mockResolvedValueOnce({
        id: 'b1',
        shopId: 'shop-1',
        status: BookingStatus.CONFIRMED,
        staffProfileId: 'sp-1',
        slotDate: '2026-04-03',
        slotTime: '13:00',
      })
      .mockResolvedValueOnce({ id: 'b2' });

    prismaMock.booking.update
      .mockResolvedValueOnce({ id: 'b1', status: BookingStatus.SKIPPED })
      .mockResolvedValueOnce({ id: 'b2', status: BookingStatus.PENDING_APPROVAL });

    await service.skipCustomer('shop-1', 'b1', 'staff-1', 'No response for 10 minutes');

    expect(prismaMock.booking.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({
          status: BookingStatus.SKIPPED,
          serviceStatus: ServiceStatus.COMPLETED,
        }),
      }),
    );
    expect(prismaMock.booking.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'b2' },
        data: {
          status: BookingStatus.PENDING_APPROVAL,
          queuePosition: null,
        },
      }),
    );
  });

  it('does not overflow into different service slots', async () => {
    jest.spyOn(service, 'updateQueueStats').mockResolvedValue();

    const currentStart = new Date('2026-04-03T13:00:00.000Z');
    const currentEnd = new Date('2026-04-03T13:30:00.000Z');

    prismaMock.booking.findFirst.mockResolvedValue({
      id: 'b1',
      shopId: 'shop-1',
      staffId: 'stf-1',
      staffProfileId: 'sp-1',
      startTime: currentStart,
      endTime: currentEnd,
      queuePosition: 1,
      adminNotes: null,
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.findUnique.mockResolvedValue({ id: 'b1' });

    await service.handleOverrun('shop-1', 'b1', 'staff-1', 15);

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shopId: 'shop-1',
          staffId: 'stf-1',
          staffProfileId: 'sp-1',
        }),
      }),
    );
  });

  it('handles overrun propagation correctly', async () => {
    jest.spyOn(service, 'updateQueueStats').mockResolvedValue();

    const baseStart = new Date('2026-04-03T13:00:00.000Z');
    const baseEnd = new Date('2026-04-03T13:30:00.000Z');

    prismaMock.booking.findFirst.mockResolvedValue({
      id: 'b1',
      shopId: 'shop-1',
      staffId: 'stf-1',
      staffProfileId: 'sp-1',
      startTime: baseStart,
      endTime: baseEnd,
      queuePosition: 1,
      adminNotes: null,
    });

    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: 'b2',
        startTime: new Date('2026-04-03T13:30:00.000Z'),
        endTime: new Date('2026-04-03T14:00:00.000Z'),
        queuePosition: 2,
      },
      {
        id: 'b3',
        startTime: new Date('2026-04-03T14:00:00.000Z'),
        endTime: new Date('2026-04-03T14:30:00.000Z'),
        queuePosition: 3,
      },
    ]);
    prismaMock.booking.findUnique.mockResolvedValue({ id: 'b1' });

    await service.handleOverrun('shop-1', 'b1', 'staff-1', 15, 'running late');

    expect(prismaMock.booking.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'b2' },
        data: {
          startTime: new Date('2026-04-03T13:45:00.000Z'),
          endTime: new Date('2026-04-03T14:15:00.000Z'),
        },
      }),
    );
    expect(prismaMock.booking.update).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { id: 'b3' },
        data: {
          startTime: new Date('2026-04-03T14:15:00.000Z'),
          endTime: new Date('2026-04-03T14:45:00.000Z'),
        },
      }),
    );
    expect(service.updateQueueStats).toHaveBeenCalledWith('shop-1');
  });
});
