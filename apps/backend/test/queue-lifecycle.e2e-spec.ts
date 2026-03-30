import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QueueController } from '../src/modules/queue/queue.controller';
import { QueueService } from '../src/modules/queue/queue.service';
import { SlotEngineService } from '../src/modules/queue/slot-engine.service';
import { QueueTrackingService } from '../src/modules/queue/queue-tracking.service';
import { QueueGateway } from '../src/modules/queue/queue.gateway';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { FraudDetectionService } from '../src/modules/fraud-detection/fraud-detection.service';

describe('Queue Lifecycle + Fraud Logging (e2e)', () => {
  let controller: QueueController;

  const queueServiceMock = {
    joinQueue: jest.fn(),
    callNextCustomer: jest.fn(),
    getQueuePosition: jest.fn(),
    markCheckedIn: jest.fn(),
    startService: jest.fn(),
    markServiceDone: jest.fn(),
    removeFromQueue: jest.fn(),
  };

  const slotEngineMock = {
    getAvailableSlots: jest.fn(),
    getNextAvailableSlot: jest.fn(),
  };

  const queueTrackingServiceMock = {
    getTrackableBookings: jest.fn(),
    getMessages: jest.fn(),
    createMessage: jest.fn(),
  };

  const queueGatewayMock = {
    emitQueueUpdate: jest.fn(),
    emitBookingUpdate: jest.fn(),
    emitPositionUpdate: jest.fn(),
  };

  const notificationsServiceMock = {
    sendBookingConfirmation: jest.fn(),
    sendTurnApproaching: jest.fn(),
    sendCheckInAcknowledgement: jest.fn(),
    sendBookingCancellationNotice: jest.fn(),
  };

  const fraudDetectionServiceMock = {
    logFraudEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        { provide: QueueService, useValue: queueServiceMock },
        { provide: SlotEngineService, useValue: slotEngineMock },
        { provide: QueueTrackingService, useValue: queueTrackingServiceMock },
        { provide: QueueGateway, useValue: queueGatewayMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: FraudDetectionService, useValue: fraudDetectionServiceMock },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
  });

  it('executes queue lifecycle mutations and emits realtime updates', async () => {
    const shopId = 'shop-1';
    const bookingId = 'booking-1';
    const userId = 'staff-1';

    const joined = {
      id: bookingId,
      shopId,
      bookingNumber: 'OL-0001',
      status: 'PENDING',
      serviceStatus: 'AWAITING_CODE',
      queuePosition: 3,
    };
    const inProgress = {
      ...joined,
      status: 'IN_PROGRESS',
      serviceStatus: 'IN_SERVICE',
    };
    const approaching = {
      ...joined,
      status: 'CONFIRMED',
      serviceStatus: 'AWAITING_CODE',
    };
    const completed = {
      ...joined,
      status: 'COMPLETED',
      serviceStatus: 'COMPLETED',
    };
    const removed = {
      ...joined,
      status: 'CANCELLED',
      serviceStatus: 'AWAITING_CODE',
    };

    queueServiceMock.joinQueue.mockResolvedValue(joined);
    queueServiceMock.callNextCustomer.mockResolvedValue(approaching);
    queueServiceMock.getQueuePosition.mockResolvedValue(1);
    queueServiceMock.markCheckedIn.mockResolvedValue({ ...joined, status: 'CONFIRMED' });
    queueServiceMock.startService.mockResolvedValue(inProgress);
    queueServiceMock.markServiceDone.mockResolvedValue(completed);
    queueServiceMock.removeFromQueue.mockResolvedValue(removed);

    await controller.joinQueue({
      shopId,
      customerName: 'Test User',
      customerPhone: '9999999999',
      serviceId: 'service-1',
    });
    await controller.callNextCustomer(shopId, userId);
    await controller.checkIn(bookingId);
    await controller.startService(bookingId, { verificationCode: '1234' }, userId);
    await controller.markDone(bookingId, userId);
    await controller.removeFromQueue(bookingId, { reason: 'Customer requested cancellation' });

    expect(queueServiceMock.joinQueue).toHaveBeenCalled();
    expect(queueServiceMock.callNextCustomer).toHaveBeenCalledWith(shopId, userId);
    expect(queueServiceMock.markCheckedIn).toHaveBeenCalledWith(bookingId);
    expect(queueServiceMock.startService).toHaveBeenCalledWith(bookingId, '1234', userId);
    expect(queueServiceMock.markServiceDone).toHaveBeenCalledWith(bookingId, userId);
    expect(queueServiceMock.removeFromQueue).toHaveBeenCalledWith(
      bookingId,
      'Customer requested cancellation',
    );

    expect(queueGatewayMock.emitQueueUpdate).toHaveBeenCalled();
    expect(queueGatewayMock.emitBookingUpdate).toHaveBeenCalled();
    expect(notificationsServiceMock.sendBookingConfirmation).toHaveBeenCalledWith(bookingId);
    expect(notificationsServiceMock.sendTurnApproaching).toHaveBeenCalledWith(bookingId, 1);
    expect(notificationsServiceMock.sendCheckInAcknowledgement).toHaveBeenCalledWith(bookingId);
    expect(notificationsServiceMock.sendBookingCancellationNotice).toHaveBeenCalledWith(
      bookingId,
      'Customer requested cancellation',
    );
  });

  it('logs fraud event and rejects when token verification fails', async () => {
    const bookingId = 'booking-2';
    const userId = 'staff-2';

    queueServiceMock.startService.mockRejectedValue(new Error('Invalid verification code'));

    await expect(
      controller.startService(bookingId, { verificationCode: '0000' }, userId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fraudDetectionServiceMock.logFraudEvent).toHaveBeenCalledWith({
      eventType: 'TOKEN_MISMATCH',
      bookingId,
      userId,
      metadata: {
        attemptedCode: '0000',
        endpoint: 'queue/start-service',
      },
    });
  });
});
