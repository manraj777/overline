import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { BookingStatus, DayOfWeek, PaymentMethod, PaymentStatus } from '@prisma/client';
import { StaffController } from './staff.controller';

describe('StaffController', () => {
  const adminServiceMock = {
    getStaffProfile: jest.fn(),
    updateStaffProfile: jest.fn(),
    getStaffOwnSchedule: jest.fn(),
    updateStaffOwnSchedule: jest.fn(),
    getStaffAssignedServices: jest.fn(),
    getStaffOwnBookings: jest.fn(),
    updateStaffOwnBookingStatus: jest.fn(),
    getStaffOwnEarnings: jest.fn(),
    getStaffOwnReviews: jest.fn(),
    updateStaffBankDetails: jest.fn(),
  };

  const prismaMock = {
    staffProfile: {
      findFirst: jest.fn(),
    },
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    staff: {
      findFirst: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const queueServiceMock = {
    callAheadCustomer: jest.fn(),
    handleOverrun: jest.fn(),
  };

  const queueTrackingServiceMock = {
    saveLocation: jest.fn(),
  };

  let controller: StaffController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StaffController(
      adminServiceMock as never,
      prismaMock as never,
      queueServiceMock as never,
      queueTrackingServiceMock as never,
    );
  });

  it('exposes controller and handler route paths for staff contract', () => {
    const classPath = Reflect.getMetadata(PATH_METADATA, StaffController);
    const mePath = Reflect.getMetadata(PATH_METADATA, controller.getMe);
    const meMethod = Reflect.getMetadata(METHOD_METADATA, controller.getMe);

    expect(classPath).toBe('staff');
    expect(mePath).toBe('me');
    expect(meMethod).toBe(RequestMethod.GET);
  });

  it('putSchedule updates days and returns latest schedule', async () => {
    adminServiceMock.getStaffOwnSchedule.mockResolvedValue({ days: [] });

    const result = await controller.putSchedule('user-1', {
      days: [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00', isOff: false },
        { dayOfWeek: DayOfWeek.TUESDAY, isOff: true },
      ],
    });

    expect(adminServiceMock.updateStaffOwnSchedule).toHaveBeenCalledTimes(2);
    expect(adminServiceMock.getStaffOwnSchedule).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ days: [] });
  });

  it('putSchedule rejects empty days', async () => {
    await expect(controller.putSchedule('user-1', { days: [] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getPendingBookings uses pending approval status filter', async () => {
    adminServiceMock.getStaffOwnBookings.mockResolvedValue({ data: [] });

    await controller.getPendingBookings('user-1', 1, 10);

    expect(adminServiceMock.getStaffOwnBookings).toHaveBeenCalledWith('user-1', {
      status: BookingStatus.PENDING_APPROVAL,
      page: 1,
      limit: 10,
    });
  });

  it('approve/reject/complete map to booking status transitions', async () => {
    adminServiceMock.updateStaffOwnBookingStatus.mockResolvedValue({ id: 'b1' });

    await controller.approveBooking('user-1', 'b1');
    expect(adminServiceMock.updateStaffOwnBookingStatus).toHaveBeenCalledWith('user-1', 'b1', {
      status: BookingStatus.CONFIRMED,
    });

    await controller.rejectBooking('user-1', 'b1', 'Not available');
    expect(adminServiceMock.updateStaffOwnBookingStatus).toHaveBeenCalledWith('user-1', 'b1', {
      status: BookingStatus.CANCELLED,
      notes: 'Not available',
    });

    await controller.completeBooking('user-1', 'b1');
    expect(adminServiceMock.updateStaffOwnBookingStatus).toHaveBeenCalledWith('user-1', 'b1', {
      status: BookingStatus.COMPLETED,
    });
  });

  it('logCash updates payment fields for own booking only', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: 'legacy-1' });
    prismaMock.staffProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    prismaMock.booking.findFirst.mockResolvedValue({ id: 'booking-1' });
    prismaMock.booking.update.mockResolvedValue({ id: 'booking-1' });

    const result = await controller.logCash('user-1', 'booking-1');

    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: {
        paymentMethod: PaymentMethod.PAY_AT_SHOP,
        paymentStatus: PaymentStatus.COMPLETED,
        status: BookingStatus.COMPLETED,
        completedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ id: 'booking-1' });
  });

  it('logCash rejects non-owned booking', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({ id: 'legacy-1' });
    prismaMock.staffProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    prismaMock.booking.findFirst.mockResolvedValue(null);

    await expect(controller.logCash('user-1', 'booking-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('queue call-ahead and overrun delegate to queue service', async () => {
    queueServiceMock.callAheadCustomer.mockResolvedValue({ id: 'b1' });
    queueServiceMock.handleOverrun.mockResolvedValue({ id: 'b1' });

    await controller.callAhead('user-1', {
      shopId: 'shop-1',
      bookingId: 'b1',
      message: 'Ready?',
    });
    expect(queueServiceMock.callAheadCustomer).toHaveBeenCalledWith(
      'shop-1',
      'b1',
      'user-1',
      'Ready?',
    );

    await controller.overrun('user-1', {
      shopId: 'shop-1',
      bookingId: 'b1',
      extraMinutes: 10,
      note: 'Delayed',
    });
    expect(queueServiceMock.handleOverrun).toHaveBeenCalledWith(
      'shop-1',
      'b1',
      'user-1',
      10,
      'Delayed',
    );
  });

  it('replyReview requires own staff profile and own review scope', async () => {
    prismaMock.staffProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    prismaMock.review.findFirst.mockResolvedValue({ id: 'review-1' });
    prismaMock.review.update.mockResolvedValue({ id: 'review-1' });

    const result = await controller.replyReview('user-1', 'review-1', { reply: 'Thank you' });

    expect(prismaMock.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: {
        staffReply: 'Thank you',
        repliedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ id: 'review-1' });
  });

  it('replyReview throws when profile missing', async () => {
    prismaMock.staffProfile.findFirst.mockResolvedValue(null);

    await expect(controller.replyReview('user-1', 'review-1', { reply: 'Thanks' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('saveUpi delegates to staff bank details update', async () => {
    adminServiceMock.updateStaffBankDetails.mockResolvedValue({ id: 'profile-1', upiId: 'a@upi' });

    const result = await controller.saveUpi('user-1', { upiId: 'a@upi' });

    expect(adminServiceMock.updateStaffBankDetails).toHaveBeenCalledWith('user-1', {
      upiId: 'a@upi',
    });
    expect(result).toEqual({ id: 'profile-1', upiId: 'a@upi' });
  });

  it('getPaymentStatus returns masked account data', async () => {
    prismaMock.staffProfile.findFirst.mockResolvedValue({
      id: 'profile-1',
      upiId: 'staff@upi',
      upiVerified: true,
      bankAccountNo: '1234567890',
      bankIfsc: 'IFSC0001',
    });

    const result = await controller.getPaymentStatus('user-1');

    expect(result).toEqual({
      id: 'profile-1',
      upiId: 'staff@upi',
      upiVerified: true,
      bankAccountNo: '******7890',
      bankIfsc: 'IFSC0001',
    });
  });
});
