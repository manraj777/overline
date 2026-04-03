import { BadRequestException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { BookingStatus, DayOfWeek } from '@prisma/client';
import { OwnerController } from './owner.controller';

describe('OwnerController', () => {
  const adminServiceMock = {
    createStaff: jest.fn(),
    getStaff: jest.fn(),
    getStaffServices: jest.fn(),
    getShopFinancials: jest.fn(),
    getBookings: jest.fn(),
    updateOwnerShopSettings: jest.fn(),
  };

  const queueServiceMock = {
    getTodayQueue: jest.fn(),
    callAheadCustomer: jest.fn(),
    handleOverrun: jest.fn(),
  };

  const prismaMock = {
    staff: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    staffProfile: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    earning: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    shop: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let controller: OwnerController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OwnerController(
      adminServiceMock as never,
      queueServiceMock as never,
      prismaMock as never,
    );
  });

  it('exposes controller and handler route paths for owner contract', () => {
    const classPath = Reflect.getMetadata(PATH_METADATA, OwnerController);
    const invitePath = Reflect.getMetadata(PATH_METADATA, controller.inviteStaff);
    const inviteMethod = Reflect.getMetadata(METHOD_METADATA, controller.inviteStaff);

    expect(classPath).toBe('owner');
    expect(invitePath).toBe('staff');
    expect(inviteMethod).toBe(RequestMethod.POST);
  });

  it('inviteStaff maps payload to admin service createStaff', async () => {
    adminServiceMock.createStaff.mockResolvedValue({ id: 'staff-1' });

    const result = await controller.inviteStaff(
      {
        shopId: 'shop-1',
        name: 'Alex',
        email: 'alex@example.com',
        phone: '9999999999',
        role: 'STAFF',
      },
      'tenant-1',
    );

    expect(adminServiceMock.createStaff).toHaveBeenCalledWith(
      'shop-1',
      {
        name: 'Alex',
        email: 'alex@example.com',
        phone: '9999999999',
        role: 'STAFF',
        avatarUrl: undefined,
      },
      'tenant-1',
    );
    expect(result).toEqual({ id: 'staff-1' });
  });

  it('listStaff rejects missing shopId', async () => {
    await expect(controller.listStaff('', 'tenant-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approveQueueBooking confirms approvable booking states only', async () => {
    prismaMock.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      status: BookingStatus.PENDING_APPROVAL,
    });
    prismaMock.booking.update.mockResolvedValue({ id: 'booking-1', status: BookingStatus.CONFIRMED });

    const result = await controller.approveQueueBooking(
      'booking-1',
      { shopId: 'shop-1' },
      'owner-1',
    );

    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: BookingStatus.CONFIRMED,
          approvedBy: 'owner-1',
        }),
      }),
    );
    expect(result).toEqual({ id: 'booking-1', status: BookingStatus.CONFIRMED });
  });

  it('getOwnerBookings forwards filters to admin service', async () => {
    adminServiceMock.getBookings.mockResolvedValue({ data: [], meta: { total: 0 } });

    const result = await controller.getOwnerBookings(
      'shop-1',
      'tenant-1',
      '2026-04-03',
      undefined,
      undefined,
      BookingStatus.CONFIRMED,
      1,
      20,
    );

    expect(adminServiceMock.getBookings).toHaveBeenCalledWith('shop-1', 'tenant-1', {
      date: '2026-04-03',
      startDate: undefined,
      endDate: undefined,
      status: BookingStatus.CONFIRMED,
      page: 1,
      limit: 20,
    });
    expect(result).toEqual({ data: [], meta: { total: 0 } });
  });

  it('triggerCallAhead delegates to queue service', async () => {
    queueServiceMock.callAheadCustomer.mockResolvedValue({ id: 'booking-1' });

    const result = await controller.triggerCallAhead(
      {
        shopId: 'shop-1',
        bookingId: 'booking-1',
        message: 'Please be ready',
      },
      'owner-1',
    );

    expect(queueServiceMock.callAheadCustomer).toHaveBeenCalledWith(
      'shop-1',
      'booking-1',
      'owner-1',
      'Please be ready',
    );
    expect(result).toEqual({ id: 'booking-1' });
  });

  it('pushQueueOverrun delegates to queue service', async () => {
    queueServiceMock.handleOverrun.mockResolvedValue({ id: 'booking-2' });

    const result = await controller.pushQueueOverrun(
      {
        shopId: 'shop-1',
        bookingId: 'booking-2',
        extraMinutes: 15,
      },
      'owner-1',
    );

    expect(queueServiceMock.handleOverrun).toHaveBeenCalledWith(
      'shop-1',
      'booking-2',
      'owner-1',
      15,
      undefined,
    );
    expect(result).toEqual({ id: 'booking-2' });
  });

  it('updateShopSettings delegates to owner settings service', async () => {
    adminServiceMock.updateOwnerShopSettings.mockResolvedValue({ id: 'shop-1' });

    const result = await controller.updateShopSettings(
      {
        shopId: 'shop-1',
        name: 'Shop Name',
      },
      'owner-1',
    );

    expect(adminServiceMock.updateOwnerShopSettings).toHaveBeenCalledWith(
      'shop-1',
      'owner-1',
      { shopId: 'shop-1', name: 'Shop Name' },
    );
    expect(result).toEqual({ id: 'shop-1' });
  });

  it('getEarningsByStaff maps grouped rows to output records', async () => {
    prismaMock.earning.groupBy.mockResolvedValue([
      {
        staffProfileId: 'sp-1',
        _sum: { amount: 1000, netAmount: 900, platformFee: 100 },
        _count: { _all: 2 },
      },
    ]);
    prismaMock.staffProfile.findMany.mockResolvedValue([
      {
        id: 'sp-1',
        user: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
      },
    ]);

    const result = await controller.getEarningsByStaff('shop-1', '2026-04-01', '2026-04-03');

    expect(result).toEqual([
      {
        staffProfileId: 'sp-1',
        staff: { id: 'sp-1', user: { id: 'u1', name: 'Alex', email: 'alex@example.com' } },
        bookingCount: 2,
        grossAmount: 1000,
        netAmount: 900,
        platformFee: 100,
      },
    ]);
  });

  it('suspend and restore update legacy and profile records when present', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: 'legacy-1' });
    prismaMock.staffProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    prismaMock.staff.update.mockResolvedValue({ id: 'legacy-1' });
    prismaMock.staffProfile.update.mockResolvedValue({ id: 'profile-1' });

    await controller.suspendStaff('legacy-1', { shopId: 'shop-1', reason: 'Policy' });
    expect(prismaMock.staff.update).toHaveBeenCalledWith({
      where: { id: 'legacy-1' },
      data: { isActive: false },
    });

    await controller.restoreStaff('legacy-1', { shopId: 'shop-1' });
    expect(prismaMock.staffProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { isActive: true, isSuspended: false, suspendReason: null },
    });
  });
});
