import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueueModule } from '../src/modules/queue/queue.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { QueueGateway } from '../src/modules/queue/queue.gateway';
import { SlotEngineService } from '../src/modules/queue/slot-engine.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

// supertest is added as a dev dependency in backend package.
const request = require('supertest');

describe('Queue HTTP Lifecycle + Fraud Persistence (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let actorUserId = '';
  let tenantId = '';
  let shopId = '';
  let serviceId = '';

  const redisMock = {
    updateShopQueueStats: jest.fn(),
    getShopQueueStats: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    increment: jest.fn(),
    ttl: jest.fn(),
  };

  const gatewayMock = {
    emitQueueUpdate: jest.fn().mockResolvedValue(undefined),
    emitBookingUpdate: jest.fn(),
    emitPositionUpdate: jest.fn(),
  };

  const notificationsMock = {
    sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
    sendTurnApproaching: jest.fn().mockResolvedValue(undefined),
    sendCheckInAcknowledgement: jest.fn().mockResolvedValue(undefined),
    sendBookingCancellationNotice: jest.fn().mockResolvedValue(undefined),
  };

  const slotEngineMock = {
    calculateWaitTime: jest.fn().mockResolvedValue(0),
    getNextAvailableSlot: jest.fn().mockResolvedValue(null),
  };

  const jwtGuardMock: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = { id: actorUserId };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [QueueModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider(QueueGateway)
      .useValue(gatewayMock)
      .overrideProvider(NotificationsService)
      .useValue(notificationsMock)
      .overrideProvider(SlotEngineService)
      .useValue(slotEngineMock)
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuardMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const staff = await prisma.user.create({
      data: {
        email: `queue-staff-${unique}@example.com`,
        name: 'Queue Staff',
        role: 'STAFF',
      },
    });
    actorUserId = staff.id;

    const tenant = await prisma.tenant.create({
      data: {
        name: `Queue Tenant ${unique}`,
        type: 'SALON',
      },
    });
    tenantId = tenant.id;

    const shop = await prisma.shop.create({
      data: {
        tenantId: tenant.id,
        name: `Queue Shop ${unique}`,
        slug: `queue-shop-${unique}`,
        address: 'Test Address',
        city: 'Bhopal',
        country: 'IN',
        latitude: 23.2599,
        longitude: 77.4126,
      },
    });
    shopId = shop.id;

    const service = await prisma.service.create({
      data: {
        shopId,
        name: 'Haircut',
        durationMinutes: 20,
        price: 199,
      },
    });
    serviceId = service.id;
  });

  afterEach(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [{ actorUserId }, { entityType: 'FRAUD' }],
      },
    });
    await prisma.bookingService.deleteMany({ where: { booking: { shopId } } });
    await prisma.booking.deleteMany({ where: { shopId } });
    await prisma.queueStats.deleteMany({ where: { shopId } });
    await prisma.service.deleteMany({ where: { shopId } });
    await prisma.shop.deleteMany({ where: { id: shopId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.user.deleteMany({ where: { id: actorUserId } });

    tenantId = '';
    shopId = '';
    serviceId = '';
    actorUserId = '';
  });

  afterAll(async () => {
    await app.close();
  });

  const joinQueue = async (customerName: string, customerPhone: string) => {
    const response = await request(app.getHttpServer())
      .post('/queue/join')
      .send({
        shopId,
        customerName,
        customerPhone,
        serviceId,
      })
      .expect(201);

    return response.body as {
      id: string;
      bookingNumber: string;
      queuePosition: number;
      status: string;
      serviceStatus: string;
      shopId: string;
    };
  };

  it('joins queue over HTTP and persists booking state', async () => {
    const joinResponse = await joinQueue('Test User', '9999999999');

    expect(joinResponse.id).toBeDefined();
    expect(joinResponse.shopId).toBe(shopId);
    expect(joinResponse.queuePosition).toBe(1);
    expect(joinResponse.status).toBe('PENDING');

    const persisted = await prisma.booking.findUnique({
      where: { id: joinResponse.id },
      include: { services: true },
    });

    expect(persisted).toBeTruthy();
    expect(persisted?.shopId).toBe(shopId);
    expect(persisted?.services.length).toBe(1);
    expect(redisMock.updateShopQueueStats).toHaveBeenCalled();
  });

  it('executes call-next, check-in, start-service(valid), mark-done, and remove over HTTP with persisted state transitions', async () => {
    const first = await joinQueue('First User', '9000000001');
    const second = await joinQueue('Second User', '9000000002');
    const third = await joinQueue('Third User', '9000000003');

    const positionResponse = await request(app.getHttpServer())
      .get(`/queue/position/${second.id}`)
      .expect(200);
    expect(positionResponse.body.position).toBe(2);

    const callNextResponse = await request(app.getHttpServer())
      .post(`/queue/${shopId}/call-next`)
      .set('Authorization', 'Bearer e2e-token')
      .expect(201);

    expect(callNextResponse.body.id).toBe(first.id);
    expect(callNextResponse.body.status).toBe('CONFIRMED');
    expect(callNextResponse.body.serviceStatus).toBe('AWAITING_CODE');

    const persistedFirst = await prisma.booking.findUnique({ where: { id: first.id } });
    expect(persistedFirst?.status).toBe('CONFIRMED');
    expect(persistedFirst?.serviceStatus).toBe('AWAITING_CODE');
    expect(persistedFirst?.startedAt).toBeNull();

    const checkInResponse = await request(app.getHttpServer())
      .patch(`/queue/${second.id}/check-in`)
      .set('Authorization', 'Bearer e2e-token')
      .expect(200);

    expect(checkInResponse.body.status).toBe('CONFIRMED');
    expect(checkInResponse.body.arrivedAt).toBeTruthy();

    const persistedSecondAfterCheckIn = await prisma.booking.findUnique({
      where: { id: second.id },
    });
    expect(persistedSecondAfterCheckIn?.status).toBe('CONFIRMED');
    expect(persistedSecondAfterCheckIn?.arrivedAt).toBeTruthy();

    const bookingBeforeStart = await prisma.booking.findUnique({ where: { id: second.id } });
    expect(bookingBeforeStart?.verificationCode).toBeTruthy();

    const startServiceResponse = await request(app.getHttpServer())
      .post(`/queue/${second.id}/start-service`)
      .set('Authorization', 'Bearer e2e-token')
      .send({ verificationCode: bookingBeforeStart?.verificationCode })
      .expect(201);

    expect(startServiceResponse.body.status).toBe('IN_PROGRESS');
    expect(startServiceResponse.body.serviceStatus).toBe('IN_SERVICE');
    expect(startServiceResponse.body.codeVerifiedBy).toBe(actorUserId);
    expect(startServiceResponse.body.codeVerifiedAt).toBeTruthy();

    const persistedSecondAfterStart = await prisma.booking.findUnique({ where: { id: second.id } });
    expect(persistedSecondAfterStart?.status).toBe('IN_PROGRESS');
    expect(persistedSecondAfterStart?.serviceStatus).toBe('IN_SERVICE');
    expect(persistedSecondAfterStart?.startedAt).toBeTruthy();
    expect(persistedSecondAfterStart?.codeVerifiedBy).toBe(actorUserId);
    expect(persistedSecondAfterStart?.codeVerifiedAt).toBeTruthy();

    const markDoneResponse = await request(app.getHttpServer())
      .post(`/queue/${second.id}/mark-done`)
      .set('Authorization', 'Bearer e2e-token')
      .expect(201);

    expect(markDoneResponse.body.status).toBe('COMPLETED');
    expect(markDoneResponse.body.serviceStatus).toBe('COMPLETED');
    expect(markDoneResponse.body.completedAt).toBeTruthy();

    const persistedSecondAfterDone = await prisma.booking.findUnique({ where: { id: second.id } });
    expect(persistedSecondAfterDone?.status).toBe('COMPLETED');
    expect(persistedSecondAfterDone?.serviceStatus).toBe('COMPLETED');
    expect(persistedSecondAfterDone?.completedAt).toBeTruthy();

    const removeResponse = await request(app.getHttpServer())
      .delete(`/queue/${third.id}`)
      .set('Authorization', 'Bearer e2e-token')
      .send({ reason: 'Removed in e2e test' })
      .expect(200);

    expect(removeResponse.body.status).toBe('CANCELLED');
    expect(removeResponse.body.adminNotes).toBe('Removed in e2e test');
    expect(removeResponse.body.cancelledAt).toBeTruthy();

    const persistedThird = await prisma.booking.findUnique({ where: { id: third.id } });
    expect(persistedThird?.status).toBe('CANCELLED');
    expect(persistedThird?.adminNotes).toBe('Removed in e2e test');
    expect(persistedThird?.cancelledAt).toBeTruthy();
  }, 20000);

  it('returns expected errors for call-next/check-in/mark-done/remove edge cases', async () => {
    await request(app.getHttpServer())
      .post(`/queue/${shopId}/call-next`)
      .set('Authorization', 'Bearer e2e-token')
      .expect(400);

    await request(app.getHttpServer())
      .patch('/queue/missing-booking-id/check-in')
      .set('Authorization', 'Bearer e2e-token')
      .expect(404);

    await request(app.getHttpServer())
      .post('/queue/missing-booking-id/mark-done')
      .set('Authorization', 'Bearer e2e-token')
      .expect(404);

    await request(app.getHttpServer())
      .delete('/queue/missing-booking-id')
      .set('Authorization', 'Bearer e2e-token')
      .send({ reason: 'missing booking' })
      .expect(404);
  });

  it('logs TOKEN_MISMATCH to audit_logs when start-service verification fails', async () => {
    const joinResponse = await joinQueue('Fraud Test User', '8888888888');
    const bookingId = joinResponse.id;

    await request(app.getHttpServer())
      .post(`/queue/${bookingId}/start-service`)
      .set('Authorization', 'Bearer e2e-token')
      .send({ verificationCode: '0000' })
      .expect(400);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'TOKEN_MISMATCH',
        entityType: 'FRAUD',
        entityId: bookingId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog?.actorUserId).toBe(actorUserId);

    const metadata = (auditLog?.metadata || {}) as Record<string, unknown>;
    expect(metadata.eventType).toBe('TOKEN_MISMATCH');
    expect(metadata.bookingId).toBe(bookingId);
    expect(metadata.attemptedCode).toBe('0000');
    expect(metadata.endpoint).toBe('queue/start-service');
    expect(typeof metadata.loggedAt).toBe('string');

    const persisted = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(persisted?.status).toBe('PENDING');
  });
});
