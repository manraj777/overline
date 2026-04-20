import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SlotEngineService } from './slot-engine.service';
import { BookingSource, BookingStatus, Prisma, ServiceStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QueueService {
  private static readonly OFFER_EXPIRY_MINUTES = 10;
  private static readonly SCHEDULED_INSERTION_QUEUE_CALLS = 2;
  private static readonly SCHEDULED_GRACE_BEFORE_MINUTES = 10;
  private static readonly SCHEDULED_GRACE_AFTER_MINUTES = 5;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private slotEngine: SlotEngineService,
  ) {}

  getQueuePolicy() {
    return {
      offerExpiryMinutes: QueueService.OFFER_EXPIRY_MINUTES,
      scheduledInsertionAfterQueueCalls: QueueService.SCHEDULED_INSERTION_QUEUE_CALLS,
      scheduledGraceBeforeMinutes: QueueService.SCHEDULED_GRACE_BEFORE_MINUTES,
      scheduledGraceAfterMinutes: QueueService.SCHEDULED_GRACE_AFTER_MINUTES,
      note: 'In-service customers are never preempted by scheduled arrivals.',
    };
  }

  /**
   * Update queue statistics for a shop
   */
  async updateQueueStats(shopId: string): Promise<void> {
    const now = new Date();

    // Count waiting bookings
    const waitingCount = await this.prisma.booking.count({
      where: {
        shopId,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.WAITLISTED,
          ],
        },
        startTime: { gte: now },
      },
    });

    // Calculate estimated wait time
    const estimatedWaitMinutes = await this.slotEngine.calculateWaitTime(shopId);

    // Get next available slot
    const avgService = await this.prisma.service.findFirst({
      where: { shopId, isActive: true },
      orderBy: { durationMinutes: 'asc' },
    });

    let nextSlot: string | undefined;
    if (avgService) {
      const next = await this.slotEngine.getNextAvailableSlot(shopId, [avgService.id]);
      nextSlot = next?.startTime;
    }

    // Update Redis cache
    await this.redis.updateShopQueueStats(shopId, {
      waitingCount,
      estimatedWaitMinutes,
      nextSlot,
    });

    // Also update database for persistence
    await this.prisma.queueStats.upsert({
      where: { shopId },
      update: {
        currentWaitingCount: waitingCount,
        estimatedWaitMinutes,
        nextAvailableSlot: nextSlot ? new Date(nextSlot) : null,
        lastUpdatedAt: now,
      },
      create: {
        shopId,
        currentWaitingCount: waitingCount,
        estimatedWaitMinutes,
        nextAvailableSlot: nextSlot ? new Date(nextSlot) : null,
      },
    });
  }

  private generateBookingNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().slice(0, 4).toUpperCase();
    return `OL-${timestamp}-${random}`;
  }

  private generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private appendAdminNote(existing: string | null | undefined, note: string): string {
    return existing ? `${existing}\n${note}` : note;
  }

  private isWithinScheduledGraceWindow(startTime: Date, now: Date): boolean {
    const lower = new Date(startTime.getTime() - QueueService.SCHEDULED_GRACE_BEFORE_MINUTES * 60000);
    const upper = new Date(startTime.getTime() + QueueService.SCHEDULED_GRACE_AFTER_MINUTES * 60000);
    return now >= lower && now <= upper;
  }

  private isScheduledBookingSource(source: BookingSource): boolean {
    return source !== BookingSource.WALK_IN;
  }

  async expireStaleSlotOffers(shopId: string): Promise<number> {
    const expiryCutoff = new Date(Date.now() - QueueService.OFFER_EXPIRY_MINUTES * 60000);

    const staleOffers = await this.prisma.booking.findMany({
      where: {
        shopId,
        status: BookingStatus.PENDING_APPROVAL,
        callAheadSentAt: { lte: expiryCutoff },
        OR: [{ callAheadReply: null }, { callAheadReply: '' }],
      },
      select: { id: true, adminNotes: true },
    });

    if (!staleOffers.length) {
      return 0;
    }

    await this.prisma.$transaction(
      staleOffers.map((offer) =>
        this.prisma.booking.update({
          where: { id: offer.id },
          data: {
            status: BookingStatus.WAITLISTED,
            callAheadReply: 'expired',
            adminNotes: this.appendAdminNote(offer.adminNotes, 'Slot offer expired automatically.'),
          },
        }),
      ),
    );

    await this.updateQueueStats(shopId);
    return staleOffers.length;
  }

  async joinWaitlist(params: {
    shopId: string;
    userId?: string;
    customerName?: string;
    customerPhone?: string;
    serviceId: string;
    desiredStartTime: string;
    preferredStaffProfileId?: string;
    maxWaitMinutes?: number;
    preferenceNote?: string;
  }) {
    const {
      shopId,
      userId,
      customerName,
      customerPhone,
      serviceId,
      desiredStartTime,
      preferredStaffProfileId,
      maxWaitMinutes,
      preferenceNote,
    } = params;

    const [shop, service] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.service.findFirst({ where: { id: serviceId, shopId, isActive: true } }),
    ]);

    if (!shop) {
      throw new Error('Shop not found');
    }

    if (!service) {
      throw new Error('Service not found for shop');
    }

    const startTime = new Date(desiredStartTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new Error('Invalid desiredStartTime');
    }

    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);
    const slotDate = new Date(startTime);
    slotDate.setHours(0, 0, 0, 0);
    const slotTime = startTime.toISOString().slice(11, 16);
    const slotEndTime = endTime.toISOString().slice(11, 16);

    const waitlistCount = await this.prisma.booking.count({
      where: {
        shopId,
        staffProfileId: preferredStaffProfileId || null,
        slotDate,
        slotTime,
        status: BookingStatus.WAITLISTED,
      },
    });

    const policyNoteParts = [
      'Waitlist enrollment',
      preferredStaffProfileId ? `preferredStaffProfileId=${preferredStaffProfileId}` : 'preferredStaffProfileId=any',
      maxWaitMinutes ? `maxWaitMinutes=${maxWaitMinutes}` : 'maxWaitMinutes=unspecified',
      preferenceNote ? `note=${preferenceNote}` : null,
    ].filter(Boolean);

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber: this.generateBookingNumber(),
        userId,
        shopId,
        staffProfileId: preferredStaffProfileId || null,
        serviceId: service.id,
        startTime,
        endTime,
        slotDate,
        slotTime,
        slotEndTime,
        totalDurationMinutes: service.durationMinutes,
        totalAmount: service.price,
        serviceAmount: service.price,
        displayAmount: service.price,
        freeCashAmount: 0,
        verificationCode: this.generateVerificationCode(),
        serviceStatus: ServiceStatus.AWAITING_CODE,
        paymentType: 'PAY_LATER',
        status: BookingStatus.WAITLISTED,
        source: userId ? BookingSource.WEB : BookingSource.WALK_IN,
        customerName: userId ? undefined : customerName,
        customerPhone: userId ? undefined : customerPhone,
        queuePosition: waitlistCount + 1,
        adminNotes: policyNoteParts.join(' | '),
        services: {
          create: [
            {
              serviceId: service.id,
              serviceName: service.name,
              durationMinutes: service.durationMinutes,
              price: service.price,
            },
          ],
        },
      },
      include: {
        services: true,
      },
    });

    await this.updateQueueStats(shopId);
    return booking;
  }

  async sendWaitlistOffer(params: {
    shopId: string;
    bookingId: string;
    staffId: string;
    slotStartTime: string;
    durationMinutes?: number;
    message?: string;
  }) {
    const { shopId, bookingId, staffId, slotStartTime, durationMinutes, message } = params;

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        shopId,
        status: { in: [BookingStatus.WAITLISTED, BookingStatus.PENDING_APPROVAL] },
      },
    });

    if (!booking) {
      throw new Error('Waitlisted booking not found for offer');
    }

    const startTime = new Date(slotStartTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new Error('Invalid slotStartTime');
    }

    const offerDuration = durationMinutes || booking.totalDurationMinutes || 30;
    const endTime = new Date(startTime.getTime() + offerDuration * 60 * 1000);
    const slotDate = new Date(startTime);
    slotDate.setHours(0, 0, 0, 0);
    const slotTime = startTime.toISOString().slice(11, 16);
    const slotEndTime = endTime.toISOString().slice(11, 16);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + QueueService.OFFER_EXPIRY_MINUTES * 60000);
    const offerNote = message?.trim()
      ? `Slot offer by ${staffId}: ${message.trim()}`
      : `Slot offer by ${staffId}`;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.PENDING_APPROVAL,
        startTime,
        endTime,
        slotDate,
        slotTime,
        slotEndTime,
        callAheadSentAt: now,
        callAheadReply: null,
        adminNotes: this.appendAdminNote(booking.adminNotes, offerNote),
      },
    });

    await this.updateQueueStats(shopId);
    return {
      ...updated,
      offerExpiresAt: expiresAt.toISOString(),
    };
  }

  async respondToWaitlistOffer(params: {
    bookingId: string;
    accepted: boolean;
    keepWaitlistedOnDecline?: boolean;
    responseNote?: string;
  }) {
    const { bookingId, accepted, keepWaitlistedOnDecline = true, responseNote } = params;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw new Error('Active slot offer not found');
    }

    if (!booking.callAheadSentAt) {
      throw new Error('Offer timestamp missing');
    }

    const expiryCutoff = new Date(
      booking.callAheadSentAt.getTime() + QueueService.OFFER_EXPIRY_MINUTES * 60000,
    );

    if (new Date() > expiryCutoff) {
      const expired = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.WAITLISTED,
          callAheadReply: 'expired',
          adminNotes: this.appendAdminNote(booking.adminNotes, 'Slot offer expired before response.'),
        },
      });

      await this.updateQueueStats(expired.shopId);
      throw new Error('Offer expired. Please wait for the next slot offer.');
    }

    const responseSuffix = responseNote?.trim() ? ` (${responseNote.trim()})` : '';

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: accepted
        ? {
            status: BookingStatus.CONFIRMED,
            queuePosition: null,
            callAheadReply: `accepted${responseSuffix}`,
            adminNotes: this.appendAdminNote(booking.adminNotes, 'Customer accepted slot offer.'),
          }
        : {
            status: keepWaitlistedOnDecline ? BookingStatus.WAITLISTED : BookingStatus.CANCELLED,
            cancelledAt: keepWaitlistedOnDecline ? null : new Date(),
            callAheadReply: `declined${responseSuffix}`,
            adminNotes: this.appendAdminNote(
              booking.adminNotes,
              keepWaitlistedOnDecline
                ? 'Customer declined slot offer and remains waitlisted.'
                : 'Customer declined slot offer and booking was cancelled.',
            ),
          },
    });

    await this.updateQueueStats(updated.shopId);
    return updated;
  }

  private async promoteNextWaitlisted(
    staffProfileId?: string | null,
    slotDate?: string | Date | null,
    slotTime?: string | Date | null,
  ): Promise<void> {
    if (!staffProfileId || !slotDate || !slotTime) {
      return;
    }

    const normalizedSlotTime =
      slotTime instanceof Date ? slotTime.toISOString().slice(11, 16) : slotTime;

    const nextWaitlisted = await this.prisma.booking.findFirst({
      where: {
        staffProfileId,
        slotDate,
        slotTime: normalizedSlotTime,
        status: BookingStatus.WAITLISTED,
      },
      orderBy: [{ queuePosition: 'asc' }, { startTime: 'asc' }],
    });

    if (!nextWaitlisted) {
      return;
    }

    await this.prisma.booking.update({
      where: { id: nextWaitlisted.id },
      data: {
        status: BookingStatus.PENDING_APPROVAL,
        queuePosition: null,
      },
    });
  }

  /**
   * Get queue position for a booking
   */
  async getQueuePosition(bookingId: string): Promise<number> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return -1;
    }

    // Count bookings before this one (same day, same shop)
    const startOfDay = new Date(booking.startTime);
    startOfDay.setHours(0, 0, 0, 0);

    const position = await this.prisma.booking.count({
      where: {
        shopId: booking.shopId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        startTime: { lt: booking.startTime, gte: startOfDay },
      },
    });

    return position + 1;
  }

  /**
   * Get next queue position for a shop (today only)
   */
  async getNextQueuePosition(shopId: string): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const activeCount = await this.prisma.booking.count({
      where: {
        shopId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        startTime: { gte: startOfDay },
      },
    });

    return activeCount + 1;
  }

  /**
   * Create a walk-in queue booking.
   */
  async joinQueue(params: {
    shopId: string;
    userId?: string;
    customerName?: string;
    customerPhone?: string;
    serviceId?: string;
  }) {
    const { shopId, userId, customerName, customerPhone, serviceId } = params;

    const [shop, activeService] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.service.findFirst({
        where: {
          shopId,
          id: serviceId,
          isActive: true,
        },
      }),
    ]);

    if (!shop) {
      throw new Error('Shop not found');
    }

    const fallbackService =
      activeService ||
      (await this.prisma.service.findFirst({
        where: { shopId, isActive: true },
        orderBy: { durationMinutes: 'asc' },
      }));

    if (!fallbackService) {
      throw new Error('No active services found for shop');
    }

    const queuePosition = await this.getNextQueuePosition(shopId);
    const bookingStart = new Date();
    bookingStart.setMinutes(
      bookingStart.getMinutes() + (queuePosition - 1) * fallbackService.durationMinutes,
    );
    const bookingEnd = new Date(
      bookingStart.getTime() + fallbackService.durationMinutes * 60 * 1000,
    );

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber: this.generateBookingNumber(),
        userId,
        shopId,
        startTime: bookingStart,
        endTime: bookingEnd,
        totalDurationMinutes: fallbackService.durationMinutes,
        totalAmount: fallbackService.price,
        serviceAmount: fallbackService.price,
        freeCashAmount: 0,
        displayAmount: fallbackService.price,
        verificationCode: this.generateVerificationCode(),
        serviceStatus: ServiceStatus.AWAITING_CODE,
        paymentType: 'PAY_LATER',
        status: BookingStatus.PENDING,
        source: BookingSource.WALK_IN,
        customerName: userId ? undefined : customerName,
        customerPhone: userId ? undefined : customerPhone,
        queuePosition,
        services: {
          create: [
            {
              serviceId: fallbackService.id,
              serviceName: fallbackService.name,
              durationMinutes: fallbackService.durationMinutes,
              price: fallbackService.price,
            },
          ],
        },
      },
      include: {
        services: true,
      },
    });

    await this.updateQueueStats(shopId);
    return booking;
  }

  async callNextCustomer(shopId: string, _staffId?: string) {
    await this.expireStaleSlotOffers(shopId);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const key = `queue:scheduled-priority:${shopId}`;
    const scheduledCounter = Number.parseInt((await this.redis.get(key)) || '0', 10) || 0;

    const candidates = await this.prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: startOfDay },
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL],
        },
      },
      orderBy: [{ queuePosition: 'asc' }, { startTime: 'asc' }],
    });

    const queueCandidates = candidates.filter((booking) =>
      !this.isScheduledBookingSource(booking.source),
    );

    const scheduledCandidates = candidates.filter(
      (booking) =>
        this.isScheduledBookingSource(booking.source) &&
        !!booking.arrivedAt &&
        this.isWithinScheduledGraceWindow(booking.startTime, now),
    );

    let nextBooking = null as (typeof candidates)[number] | null;

    if (queueCandidates.length && scheduledCandidates.length) {
      if (scheduledCounter >= QueueService.SCHEDULED_INSERTION_QUEUE_CALLS) {
        nextBooking = scheduledCandidates[0];
        await this.redis.set(key, '0', 3600);
      } else {
        nextBooking = queueCandidates[0];
        await this.redis.set(key, String(scheduledCounter + 1), 3600);
      }
    } else if (scheduledCandidates.length) {
      nextBooking = scheduledCandidates[0];
      await this.redis.set(key, '0', 3600);
    } else if (queueCandidates.length) {
      nextBooking = queueCandidates[0];
      await this.redis.set(
        key,
        String(Math.min(scheduledCounter + 1, QueueService.SCHEDULED_INSERTION_QUEUE_CALLS)),
        3600,
      );
    } else {
      nextBooking = candidates[0] || null;
    }

    if (!nextBooking) {
      throw new Error('No waiting customer in queue');
    }

    const updated = await this.prisma.booking.update({
      where: { id: nextBooking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        serviceStatus: ServiceStatus.AWAITING_CODE,
      },
    });

    await this.updateQueueStats(shopId);
    return updated;
  }

  async markCheckedIn(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        arrivedAt: new Date(),
        status: booking.status === BookingStatus.PENDING ? BookingStatus.CONFIRMED : booking.status,
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async startService(bookingId: string, verificationCode: string, staffId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.verificationCode || booking.verificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    const now = new Date();
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        serviceStatus: ServiceStatus.IN_SERVICE,
        startedAt: now,
        arrivedAt: booking.arrivedAt || now,
        codeVerifiedBy: staffId,
        codeVerifiedAt: now,
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async markServiceDone(bookingId: string, _staffId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        serviceStatus: ServiceStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.promoteNextWaitlisted(booking.staffProfileId, booking.slotDate, booking.slotTime);

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async removeFromQueue(bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        adminNotes: reason,
      },
    });

    await this.updateQueueStats(booking.shopId);
    return updated;
  }

  async callAheadCustomer(shopId: string, bookingId: string, staffId: string, message?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        shopId,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.WAITLISTED,
            BookingStatus.CONFIRMED,
          ],
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found or cannot be called ahead');
    }

    const note = message?.trim()
      ? `Call-ahead by ${staffId}: ${message.trim()}`
      : `Call-ahead by ${staffId}`;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status:
          booking.status === BookingStatus.PENDING ||
          booking.status === BookingStatus.PENDING_APPROVAL ||
          booking.status === BookingStatus.WAITLISTED
            ? BookingStatus.CONFIRMED
            : booking.status,
        adminNotes: booking.adminNotes ? `${booking.adminNotes}\n${note}` : note,
      },
    });

    await this.updateQueueStats(shopId);
    return updated;
  }

  async skipCustomer(shopId: string, bookingId: string, staffId: string, reason?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        shopId,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.WAITLISTED,
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.IN_SERVICE,
          ],
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found or cannot be skipped');
    }

    const note = reason?.trim()
      ? `Skipped by ${staffId}: ${reason.trim()}`
      : `Skipped by ${staffId}`;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.SKIPPED,
        serviceStatus: ServiceStatus.COMPLETED,
        adminNotes: booking.adminNotes ? `${booking.adminNotes}\n${note}` : note,
      },
    });

    await this.promoteNextWaitlisted(booking.staffProfileId, booking.slotDate, booking.slotTime);

    await this.updateQueueStats(shopId);
    return updated;
  }

  async handleOverrun(
    shopId: string,
    bookingId: string,
    staffId: string,
    extraMinutes: number,
    note?: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        shopId,
        status: { in: [BookingStatus.IN_PROGRESS, BookingStatus.IN_SERVICE, BookingStatus.CONFIRMED] },
      },
      select: {
        id: true,
        shopId: true,
        staffId: true,
        staffProfileId: true,
        startTime: true,
        endTime: true,
        queuePosition: true,
        adminNotes: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found or not eligible for overrun');
    }

    const extensionMs = extraMinutes * 60 * 1000;
    const nextEndTime = new Date(booking.endTime.getTime() + extensionMs);
    const appendedNote = note?.trim()
      ? `Overrun +${extraMinutes}m by ${staffId}: ${note.trim()}`
      : `Overrun +${extraMinutes}m by ${staffId}`;

    const dayStart = new Date(booking.startTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(booking.startTime);
    dayEnd.setHours(23, 59, 59, 999);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          endTime: nextEndTime,
          adminNotes: booking.adminNotes
            ? `${booking.adminNotes}\n${appendedNote}`
            : appendedNote,
        },
      });

      const impacted = await tx.booking.findMany({
        where: {
          shopId,
          ...(booking.staffId ? { staffId: booking.staffId } : {}),
          ...(booking.staffProfileId ? { staffProfileId: booking.staffProfileId } : {}),
          id: { not: booking.id },
          startTime: { gte: dayStart, lte: dayEnd, gt: booking.startTime },
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.PENDING_APPROVAL,
              BookingStatus.WAITLISTED,
              BookingStatus.CONFIRMED,
              BookingStatus.IN_PROGRESS,
              BookingStatus.IN_SERVICE,
            ],
          },
        },
        orderBy: [
          { queuePosition: 'asc' },
          { startTime: 'asc' },
        ],
      });

      for (const item of impacted) {
        await tx.booking.update({
          where: { id: item.id },
          data: {
            startTime: new Date(item.startTime.getTime() + extensionMs),
            endTime: new Date(item.endTime.getTime() + extensionMs),
          },
        });
      }
    });

    await this.updateQueueStats(shopId);
    return this.prisma.booking.findUnique({ where: { id: bookingId } });
  }

  /**
   * Get today's queue for a shop
   */
  async getTodayQueue(shopId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const baseWhere = {
      shopId,
      startTime: { gte: startOfDay, lte: endOfDay },
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
    };

    const baseInclude = {
      services: {
        include: {
          service: {
            select: {
              name: true,
            },
          },
        },
      },
      staff: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    let bookings: any[] = [];
    try {
      bookings = await this.prisma.booking.findMany({
        where: baseWhere,
        include: {
          ...baseInclude,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              // Trust fields are optional at runtime in older DBs.
              trustScore: true,
              noShowBookings: true,
              totalBookings: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });
    } catch (error: any) {
      if (error?.code !== 'P2022') {
        throw error;
      }

      bookings = await this.prisma.booking.findMany({
        where: baseWhere,
        include: {
          ...baseInclude,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });
    }

    // Group by status
    const upcoming = bookings.filter(
      (b) => ['PENDING', 'CONFIRMED'].includes(b.status) && b.startTime > now,
    );
    const inProgress = bookings.filter((b) => b.status === 'IN_PROGRESS');
    const completed = bookings.filter((b) => b.status === 'COMPLETED');
    const noShow = bookings.filter((b) => b.status === 'NO_SHOW');

    return {
      upcoming,
      inProgress,
      completed,
      noShow,
      stats: {
        total: bookings.length,
        upcomingCount: upcoming.length,
        inProgressCount: inProgress.length,
        completedCount: completed.length,
        noShowCount: noShow.length,
      },
    };
  }

  /**
   * Get queue stats for a shop (from Redis or DB)
   */
  async getQueueStats(shopId: string) {
    // Try Redis first
    const cached = await this.redis.getShopQueueStats(shopId);
    if (cached) return cached;

    // Fall back to DB
    const dbStats = await this.prisma.queueStats.findUnique({
      where: { shopId },
    });

    if (dbStats) {
      return {
        waitingCount: dbStats.currentWaitingCount,
        estimatedWaitMinutes: dbStats.estimatedWaitMinutes,
        nextSlot: dbStats.nextAvailableSlot?.toISOString() || null,
      };
    }

    return { waitingCount: 0, estimatedWaitMinutes: 0, nextSlot: null };
  }

  /**
   * Invalidate slot cache when bookings change
   */
  async invalidateSlotCache(shopId: string, date?: Date): Promise<void> {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    await this.redis.invalidateSlots(shopId, dateStr);
  }
}
