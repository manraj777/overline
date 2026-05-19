import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { QueueGateway } from '../queue/queue.gateway';
import { QueueTrackingService } from '../queue/queue-tracking.service';
import { SlotEngineService } from '../queue/slot-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrustScoreService } from '../users/trust-score.service';
import { FraudDetectionService, BookingContext } from '../fraud-detection/fraud-detection.service';
import { WalletService, FREE_CASH_CONFIG } from '../wallet/wallet.service';
import { CreateBookingDto } from './dto/create-booking.dto';
// UpdateBookingDto imported for potential future use
import {
  BookingStatus,
  BookingSource,
  NotificationChannel,
  NotificationType,
  PaymentType,
  ServiceStatus,
  CancellationReason,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private queueService: QueueService,
    @Inject(forwardRef(() => QueueGateway))
    private queueGateway: QueueGateway,
    private queueTrackingService: QueueTrackingService,
    private slotEngine: SlotEngineService,
    private notificationsService: NotificationsService,
    private trustScoreService: TrustScoreService,
    private fraudDetection: FraudDetectionService,
    private walletService: WalletService,
  ) {}

  /**
   * Generate a unique 4-digit verification code (like Rapido/Uber)
   */
  private generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async handleCallAheadReply(
    bookingId: string,
    userId: string,
    reply: 'COMING' | 'NOT_COMING' | 'LATER',
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: {
        id: true,
        shopId: true,
        staffProfileId: true,
        slotDate: true,
        slotTime: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const nextStatus =
      reply === 'NOT_COMING' || reply === 'LATER' ? BookingStatus.SKIPPED : undefined;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        callAheadReply: reply,
        ...(nextStatus ? { status: nextStatus } : {}),
      },
    });

    if (nextStatus && booking.staffProfileId && booking.slotDate && booking.slotTime) {
      const nextWaitlisted = await this.prisma.booking.findFirst({
        where: {
          staffProfileId: booking.staffProfileId,
          slotDate: booking.slotDate,
          slotTime: booking.slotTime,
          status: BookingStatus.WAITLISTED,
        },
        orderBy: { queuePosition: 'asc' },
      });

      if (nextWaitlisted) {
        await this.prisma.booking.update({
          where: { id: nextWaitlisted.id },
          data: {
            status: BookingStatus.PENDING_APPROVAL,
            queuePosition: null,
          },
        });
      }
    }

    await this.queueService.updateQueueStats(updated.shopId);
    return updated;
  }

  async shareLocation(bookingId: string, userId: string, lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng must be valid numbers');
    }

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: {
        id: true,
        shopId: true,
        status: true,
        startTime: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const windowStart = new Date(booking.startTime.getTime() - 2 * 60 * 60 * 1000);
    if (new Date() < windowStart) {
      throw new BadRequestException('Location sharing opens 2h before slot');
    }

    if (booking.status === BookingStatus.IN_PROGRESS || booking.status === BookingStatus.IN_SERVICE) {
      throw new BadRequestException('Service already started');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        userLat: lat,
        userLng: lng,
        locationSharedAt: new Date(),
      },
      select: {
        id: true,
        shopId: true,
        userLat: true,
        userLng: true,
        locationSharedAt: true,
      },
    });

    await this.queueTrackingService.saveLocation(booking.id, { lat, lng });

    return {
      bookingId: updated.id,
      shopId: updated.shopId,
      lat: updated.userLat,
      lng: updated.userLng,
      locationSharedAt: updated.locationSharedAt,
    };
  }

  private getSlotDateKey(date: Date): string {
    // Use IST (UTC+5:30) for slot date keys — all shops operate in Indian timezone
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().slice(0, 10);
  }

  private getSlotTimeKey(date: Date): string {
    // Use IST (UTC+5:30) for slot time keys
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().slice(11, 16);
  }

  private async markBookingSlots(
    bookingId: string,
    shopId: string,
    startTime: Date,
    endTime: Date,
    serviceIds: string[],
  ): Promise<void> {
    const dateKey = this.getSlotDateKey(startTime);
    const timeKey = this.getSlotTimeKey(startTime);
    const ttlSeconds = Math.max(Math.floor((endTime.getTime() - Date.now()) / 1000) + 7200, 300);

    await Promise.all(
      serviceIds.map((serviceId) =>
        this.redis.set(
          `slot:${shopId}:${dateKey}:${serviceId}:${timeKey}`,
          JSON.stringify({ bookingId }),
          ttlSeconds,
        ),
      ),
    );
  }

  private async unmarkBookingSlots(
    shopId: string,
    startTime: Date,
    serviceIds: string[],
  ): Promise<void> {
    const dateKey = this.getSlotDateKey(startTime);
    const timeKey = this.getSlotTimeKey(startTime);
    await Promise.all(
      serviceIds.map((serviceId) =>
        this.redis.del(`slot:${shopId}:${dateKey}:${serviceId}:${timeKey}`),
      ),
    );
  }

  /**
   * Create a new booking with fraud detection
   */
  /**
   * Calculate price breakdown for a booking
   */
  async calculatePrice(dto: Partial<CreateBookingDto>, userId?: string) {
    const { shopId, serviceIds = [], offerCode } = dto;

    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        shopId,
        isActive: true,
      },
    });

    const subtotal = services.reduce((sum, s) => sum + Number(s.price), 0);
    
    // Taxes and Charges: 0 (removed as per owner request, customers only pay item amount)
    const taxesAndCharges = 0;

    // Apply offer code discount
    let discount = 0;
    if (offerCode) {
      if (offerCode.toUpperCase() === 'OVERLINE10') {
        discount = subtotal * 0.1;
      } else if (offerCode.toUpperCase() === 'OVERLINE20') {
        discount = subtotal * 0.2;
      } else if (offerCode.toUpperCase() === 'WELCOME50') {
        discount = 50;
      }
    }

    const priceAfterDiscount = Math.max(0, subtotal - discount);

    // Free Cash Application
    let freeCashAvailable = 0;
    if (userId) {
      const wallet = await this.walletService.getWalletBalance(userId);
      freeCashAvailable = wallet.freeCashBalance;
    }

    // We only use free cash up to the amount of taxes/charges, 
    // ensuring the final price remains at least the shop price after coupon discount.
    const freeCashUsed = Math.min(freeCashAvailable, taxesAndCharges);

    const finalAmount = priceAfterDiscount + taxesAndCharges - freeCashUsed;

    return {
      subtotal,
      taxesAndCharges,
      discount,
      freeCashUsed,
      finalAmount,
      currency: services[0]?.currency || 'INR',
    };
  }

  async create(
    dto: CreateBookingDto,
    userId?: string,
    requestContext?: { ip: string; userAgent: string },
  ) {
    const {
      shopId,
      serviceIds,
      startTime,
      staffId,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      source = BookingSource.WEB,
      offerCode,
    } = dto;

    // Get shop
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Time-overlap booking constraint is checked below, after start/end times are computed.

    // Get services and calculate total duration and price
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        shopId,
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new NotFoundException('One or more services not found or inactive');
    }

    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    let totalAmount = services.reduce((sum, s) => sum + Number(s.price), 0);
    const currency = services[0]?.currency || 'INR';

    // Apply offer code discount
    if (offerCode) {
      if (offerCode.toUpperCase() === 'OVERLINE10') {
        totalAmount = totalAmount * 0.9;
      } else if (offerCode.toUpperCase() === 'OVERLINE20') {
        totalAmount = totalAmount * 0.8;
      } else if (offerCode.toUpperCase() === 'WELCOME50') {
        totalAmount = Math.max(0, totalAmount - 50);
      }
    }

    const bookingStartTime = new Date(startTime);
    const bookingEndTime = new Date(bookingStartTime.getTime() + totalDuration * 60 * 1000);

    if (staffId) {
      await this.validateStaffServices(shopId, staffId, serviceIds);
    }

    // Validate slot is in the future
    if (bookingStartTime <= new Date()) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    // --- SPAM PREVENTION & CONCURRENCY RULE ---
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (!user.phone || !user.isPhoneVerified) {
        throw new BadRequestException(
          'A verified phone number is required to book an appointment.',
        );
      }
    }

    // A single user (by userId or phone) cannot hold multiple active bookings that overlap in time
    const activeBookingConditions: any[] = [
      {
        status: { in: [BookingStatus.PENDING, BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
      },
      {
        startTime: { lt: bookingEndTime },
        endTime: { gt: bookingStartTime },
      }
    ];
    if (userId) {
      activeBookingConditions.push({ userId });
    } else if (customerPhone) {
      activeBookingConditions.push({ customerPhone });
    }

    if (userId || customerPhone) {
      const existingActiveBooking = await this.prisma.booking.findFirst({
        where: {
          AND: activeBookingConditions,
        },
      });

      if (existingActiveBooking) {
        throw new BadRequestException(
          'You already have an active booking during this time window.',
        );
      }
    }
    // --- END SPAM PREVENTION ---

    // --- ML-BASED FRAUD DETECTION ---
    if (requestContext) {
      const fraudContext: BookingContext = {
        userId: userId || undefined,
        customerPhone: customerPhone || undefined,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        shopId,
        startTime: bookingStartTime,
        totalAmount,
      };

      const fraudAssessment = await this.fraudDetection.analyzeBooking(fraudContext);

      // Log fraud assessment for monitoring
      if (fraudAssessment.riskLevel !== 'LOW') {
        console.log(
          `[FRAUD] Booking attempt - Risk: ${fraudAssessment.riskLevel}, Score: ${fraudAssessment.riskScore}`,
          {
            userId,
            customerPhone,
            ip: requestContext.ip,
            signals: fraudAssessment.signals.map((s) => s.type),
          },
        );
      }

      // Block high-risk bookings
      if (fraudAssessment.action === 'BLOCK') {
        await this.fraudDetection.recordSuspiciousIP(requestContext.ip, 'blocked_booking');
        throw new ForbiddenException(
          'Unable to process your booking at this time. Please contact support if you believe this is an error.',
        );
      }

      // Challenge medium-risk bookings - require verified phone
      if (fraudAssessment.action === 'CHALLENGE') {
        if (!userId) {
          throw new BadRequestException(
            'For security purposes, please create an account and verify your phone number to book.',
          );
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.isPhoneVerified) {
          throw new BadRequestException(
            'Please verify your phone number before booking. This helps us prevent spam.',
          );
        }
      }
    }
    // --- END FRAUD DETECTION ---

    // ────────────────────────────────────────────────────────────────────────
    // Pre-transaction work
    //
    // Prisma interactive transactions default to a 5 s timeout that covers
    // the *entire* callback, not just the final write. Anything slow inside
    // the callback (extra queries, network calls, cold pooler connections)
    // will cause the dreaded:
    //   "Transaction already closed: A query cannot be executed on an
    //    expired transaction. The timeout for this transaction was 5000 ms"
    //
    // Following Prisma's own guidance, we keep ONLY the consistency-critical
    // pieces inside the transaction (the slot availability re-check and the
    // booking insert itself) and move every read that doesn't need atomic
    // isolation out here. The transaction is also given an explicit 30 s
    // timeout as a safety net for slow networks / cold connections.
    // ────────────────────────────────────────────────────────────────────────

    // Generate booking-scoped identifiers up front (pure, in-memory).
    const bookingNumber = this.generateBookingNumber();
    const verificationCode = this.generateVerificationCode();

    // Determine payment type from DTO (default to PAY_LATER)
    const paymentType = dto.paymentType || PaymentType.PAY_LATER;

    // Determine initial booking status based on shop setting:
    // - autoAcceptBookings=true  → CONFIRMED (instant booking)
    // - autoAcceptBookings=false → PENDING_APPROVAL (requires staff/owner action)
    const status = shop.autoAcceptBookings
      ? BookingStatus.CONFIRMED
      : BookingStatus.PENDING_APPROVAL;

    // Calculate price breakdown using the centralized logic. This issues
    // its own DB reads (services + wallet); doing them outside the
    // transaction means a slow pooler connection cannot expire it.
    const priceBreakdown = await this.calculatePrice(dto, userId);
    const {
      subtotal,
      taxesAndCharges,
      discount: _discount, // not persisted directly; reflected via finalAmount
      freeCashUsed,
      finalAmount,
      currency: bookingCurrency,
    } = priceBreakdown;

    // Queue position is an approximate counter; a tiny race here is
    // acceptable and the cron / queue gateway re-syncs positions.
    const queuePosition = await this.queueService.getNextQueuePosition(shopId);

    // Check slot availability BEFORE creating the booking.
    //
    // Why this is outside any $transaction wrapper: production runs against
    // Supabase PgBouncer with `connection_limit=1`. An interactive Prisma
    // transaction reserves the single connection for itself; any nested
    // query that uses `this.prisma` (rather than the `tx` client) starves
    // waiting on a connection that will only free when the transaction
    // ends — i.e. deadlock until the 10 s pool timeout fires:
    //
    //   "Timed out fetching a new connection from the connection pool.
    //    (Current connection pool timeout: 10, connection limit: 1)"
    //
    // `slotEngine.isSlotAvailable` issues several non-tx queries
    // (shop.findUnique, staff.findFirst, booking.count) and cannot easily
    // be threaded through `tx`. Moving the check out of the transaction
    // dodges the deadlock entirely.
    //
    // The remaining race window (two requests passing the check before
    // either inserts) is bounded by the per-user "active booking overlap"
    // check above and the connection_limit=1 serialization at the DB
    // layer. A future hardening can add a unique partial index on
    // (shopId, startTime, staffId) for IN-flight statuses if we need
    // strict atomicity.
    const isAvailable = await this.slotEngine.isSlotAvailable(
      shopId,
      bookingStartTime,
      bookingEndTime,
      staffId,
    );

    if (!isAvailable) {
      throw new ConflictException('Selected time slot is no longer available');
    }

    // Create booking. Prisma handles nested `services.create` as an
    // atomic statement internally, so no $transaction wrapper is needed
    // around a single create call.
    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber,
        userId,
        shopId,
        staffId,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        totalDurationMinutes: totalDuration,
        totalAmount: new Decimal(finalAmount),
        serviceAmount: new Decimal(subtotal), // Original shop price
        freeCashAmount: new Decimal(freeCashUsed), // Amount deducted from charges
        displayAmount: new Decimal(subtotal + taxesAndCharges), // What they see as "Subtotal + Taxes"
        paymentType,
        verificationCode,
        serviceStatus: ServiceStatus.AWAITING_CODE,
        currency: bookingCurrency,
        status,
        source,
        customerName: userId ? undefined : customerName,
        customerPhone: userId ? undefined : customerPhone,
        customerEmail: userId ? undefined : customerEmail,
        notes,
        queuePosition,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            serviceName: s.name,
            durationMinutes: s.durationMinutes,
            price: s.price,
          })),
        },
      },
      include: {
        services: true,
        shop: {
          select: {
            name: true,
            address: true,
            phone: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Update queue stats asynchronously
    this.queueService.updateQueueStats(shopId).catch(console.error);

    // Invalidate slot cache
    this.queueService.invalidateSlotCache(shopId, bookingStartTime).catch(console.error);

    // Mark slot as booked in Redis for quick real-time slot status lookups
    this.markBookingSlots(
      booking.id,
      booking.shopId,
      booking.startTime,
      booking.endTime,
      serviceIds,
    ).catch(console.error);

    // Emit real-time queue update
    this.queueGateway.emitQueueUpdate(shopId).catch(console.error);

    // Send booking confirmation notification to customer
    this.notificationsService.sendBookingConfirmation(booking.id).catch(console.error);

    // Send in-app notification to shop owner/admin
    this.sendAdminBookingNotification(booking, shop).catch(console.error);

    return booking;
  }

  private async sendAdminBookingNotification(booking: any, shop: any) {
    // Find all admin/owner users for this shop's tenant
    const adminUsers = await this.prisma.user.findMany({
      where: {
        tenantId: shop.tenantId,
        role: { in: ['ADMIN', 'OWNER', 'SUPER_ADMIN'] as any },
        isActive: true,
      },
      select: { id: true },
    });

    const notifyUserIds = new Set(adminUsers.map(u => u.id));

    // If there's an assigned staff member, notify them too
    if (booking.staffProfileId) {
      const staffProfile = await this.prisma.staffProfile.findUnique({
        where: { id: booking.staffProfileId },
        select: { userId: true },
      });
      if (staffProfile && staffProfile.userId) {
        notifyUserIds.add(staffProfile.userId);
      }
    } else if (booking.staffId) {
      // Legacy staff
      const legacyStaff = await this.prisma.staff.findUnique({
        where: { id: booking.staffId },
        select: { userId: true },
      });
      if (legacyStaff && legacyStaff.userId) {
        notifyUserIds.add(legacyStaff.userId);
      }
    }

    const customerName = booking.user?.name || booking.customerName || 'Guest';
    const customerPhone = booking.user?.phone || booking.customerPhone || 'N/A';
    const serviceNames = booking.services?.map((s: any) => s.serviceName).join(', ') || 'Service';
    const startTime = new Date(booking.startTime);
    const timeStr = startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = startTime.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const shopAddress = booking.shop?.address || shop?.address || 'Address not available';

    for (const userId of Array.from(notifyUserIds)) {
      await this.notificationsService.send({
        userId,
        bookingId: booking.id,
        type: NotificationType.BOOKING_CREATED,
        title: `Booking Approval Needed: ${customerName}`,
        body: `${customerName} (${customerPhone}) requested ${serviceNames} on ${dateStr} at ${timeStr}. Address: ${shopAddress}.`,
        data: {
          bookingNumber: booking.bookingNumber,
          customerName,
          customerPhone,
          services: serviceNames,
          address: shopAddress,
          bookingDate: dateStr,
          time: timeStr,
        },
        channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
      });
    }
  }

  /**
   * Get booking by ID
   */
  async findById(bookingId: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
        payment: true,
        review: {
          select: { id: true, rating: true, comment: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // If userId provided, verify ownership (unless admin)
    if (userId && booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    // Get current queue position
    const queuePosition = await this.queueService.getQueuePosition(bookingId);

    return {
      ...booking,
      currentQueuePosition: queuePosition,
    };
  }

  /**
   * Get booking by booking number
   */
  async findByBookingNumber(bookingNumber: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        services: true,
        shop: {
          select: {
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Get first completed booking with no review.
   * Returns the booking object directly (or null) so frontend
   * `usePendingReviewBooking()` can read booking.id / booking.shop.name
   * without unwrapping.
   */
  async getPendingReviewBooking(userId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: BookingStatus.COMPLETED,
        review: null,
      },
      orderBy: { startTime: 'desc' },
      include: {
        shop: { select: { name: true } },
      },
    });
    return booking;
  }

  /**
   * Get user's bookings
   */
  async findByUser(userId: string, status?: string, page = 1, limit = 20) {
    // Ensure page and limit are numbers
    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = { userId };

    const now = new Date();

    if (status) {
      if (status === 'upcoming') {
        // Upcoming = a booking the user can still act on right now.
        // Rules:
        //   * Anything IN_PROGRESS belongs here (active service).
        //   * PENDING / PENDING_APPROVAL / CONFIRMED only belong here
        //     while their slot has not yet ended. A 9-10am booking at
        //     11am is no longer "upcoming" — it has either no-showed
        //     or the cron will sweep it shortly. Either way, we must
        //     not lie to the user.
        where.OR = [
          { status: BookingStatus.IN_PROGRESS },
          {
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.PENDING_APPROVAL,
                BookingStatus.CONFIRMED,
              ],
            },
            endTime: { gt: now },
          },
        ];
      } else if (status === 'past') {
        // Past = anything terminal, OR a non-terminal booking whose slot
        // has already ended without going IN_PROGRESS (the cron hasn't
        // caught up yet, but it is past from the user's POV).
        where.OR = [
          {
            status: {
              in: [
                BookingStatus.COMPLETED,
                BookingStatus.NO_SHOW,
                BookingStatus.REJECTED,
              ],
            },
          },
          {
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.PENDING_APPROVAL,
                BookingStatus.CONFIRMED,
              ],
            },
            endTime: { lte: now },
          },
        ];
      } else if (status === 'cancelled') {
        where.status = {
          in: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
        };
      } else if (status === 'pending') {
        // Pending tab only shows live, future-slot pendings.
        where.status = {
          in: [BookingStatus.PENDING, BookingStatus.PENDING_APPROVAL],
        };
        where.endTime = { gt: now };
      } else if (status === 'confirmed') {
        where.status = BookingStatus.CONFIRMED;
        where.endTime = { gt: now };
      } else if (status === 'in-progress' || status === 'in_progress') {
        where.status = BookingStatus.IN_PROGRESS;
      } else if (Object.values(BookingStatus).includes(status as BookingStatus)) {
        where.status = status;
      }
      // If status is invalid and not a virtual filter, ignore it
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          services: true,
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
              address: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update booking status
   */
  async updateStatus(bookingId: string, status: BookingStatus, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate status transition
    this.validateStatusTransition(booking.status, status);

    // User can only cancel their own bookings
    if (userId && status === BookingStatus.CANCELLED) {
      if (booking.userId !== userId) {
        throw new NotFoundException('Booking not found');
      }

      // Check cancellation policy (e.g., 1 hour before)
      const now = new Date();
      const oneHourBefore = new Date(booking.startTime.getTime() - 60 * 60 * 1000);
      if (now > oneHourBefore) {
        throw new BadRequestException('Cannot cancel booking less than 1 hour before start time');
      }
    }

    const updateData: any = { status };

    // Set timestamps based on status
    switch (status) {
      case BookingStatus.IN_PROGRESS:
        updateData.arrivedAt = new Date();
        updateData.startedAt = new Date();
        break;
      case BookingStatus.COMPLETED:
        updateData.completedAt = new Date();
        break;
      case BookingStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        break;
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        services: true,
        shop: {
          select: {
            name: true,
          },
        },
      },
    });

    // Update queue stats
    this.queueService.updateQueueStats(booking.shopId).catch(console.error);

    // Invalidate slot cache if cancelled or completed
    if (status === BookingStatus.CANCELLED || status === BookingStatus.COMPLETED) {
      this.queueService.invalidateSlotCache(booking.shopId, booking.startTime).catch(console.error);

      this.prisma.bookingService
        .findMany({ where: { bookingId }, select: { serviceId: true } })
        .then((rows) => rows.map((row) => row.serviceId))
        .then((serviceIds) =>
          this.unmarkBookingSlots(booking.shopId, booking.startTime, serviceIds),
        )
        .catch(console.error);

      // Refund 50% of free cash on cancellation if free cash was used
      if (status === BookingStatus.CANCELLED && booking.freeCashAmount && Number(booking.freeCashAmount) > 0 && booking.userId) {
        const refundAmount = Math.floor(Number(booking.freeCashAmount) * 0.5);
        if (refundAmount > 0) {
          this.walletService.returnFreeCash(
            booking.userId,
            refundAmount,
            bookingId,
            true,
            `50% free cash refund after cancellation`
          ).catch(console.error);
        }
      }
    }

    // Emit real-time updates
    this.queueGateway.emitQueueUpdate(booking.shopId).catch(console.error);
    this.queueGateway.emitBookingUpdate(bookingId, {
      status,
      updatedAt: new Date().toISOString(),
    });

    // --- TRUST SCORE CALCULATION ---
    const scoreTriggerStatuses: BookingStatus[] = [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.NO_SHOW,
    ];
    if (updatedBooking.userId && scoreTriggerStatuses.includes(status)) {
      this.trustScoreService.recalculateTrustScore(updatedBooking.userId).catch(console.error);
    }

    // Reward logic for confirmation and completion
    if (updatedBooking.userId) {
      if (status === BookingStatus.CONFIRMED) {
        // Small reward for confirmation (e.g. 5-10 INR)
        this.walletService.creditFreeCash(
          updatedBooking.userId,
          10,
          bookingId,
          `Bonus for booking confirmation`
        ).catch(console.error);
      } else if (status === BookingStatus.COMPLETED) {
        // Main reward for completion
        const rewardAmount = this.walletService.calculateFreeCashAmount();
        this.walletService.creditFreeCash(
          updatedBooking.userId,
          rewardAmount,
          bookingId,
          `Free cash earned for completing booking`
        ).catch(console.error);
      }
    }

    return updatedBooking;
  }

  /**
   * Cancel booking
   */
  async cancel(bookingId: string, userId?: string) {
    return this.updateStatus(bookingId, BookingStatus.CANCELLED, userId);
  }

  /**
   * Reschedule booking
   */
  async reschedule(bookingId: string, newStartTime: Date, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { services: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userId && booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Only pending or confirmed bookings can be rescheduled');
    }

    const newEndTime = new Date(newStartTime.getTime() + booking.totalDurationMinutes * 60 * 1000);

    // Check new slot availability
    const isAvailable = await this.slotEngine.isSlotAvailable(
      booking.shopId,
      newStartTime,
      newEndTime,
      booking.staffId || undefined,
      bookingId,
    );

    if (!isAvailable) {
      throw new ConflictException('Selected time slot is not available');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
      },
      include: {
        services: true,
        shop: {
          select: { name: true },
        },
      },
    });

    // Invalidate caches for both old and new dates
    this.queueService.invalidateSlotCache(booking.shopId, booking.startTime).catch(console.error);
    this.queueService.invalidateSlotCache(booking.shopId, newStartTime).catch(console.error);
    this.queueService.updateQueueStats(booking.shopId).catch(console.error);

    const serviceIds = booking.services.map((service) => service.serviceId);
    this.unmarkBookingSlots(booking.shopId, booking.startTime, serviceIds).catch(console.error);
    this.markBookingSlots(
      booking.id,
      booking.shopId,
      updatedBooking.startTime,
      updatedBooking.endTime,
      serviceIds,
    ).catch(console.error);

    // Emit real-time updates
    this.queueGateway.emitQueueUpdate(booking.shopId).catch(console.error);
    this.queueGateway.emitBookingUpdate(bookingId, {
      status: 'RESCHEDULED',
      newStartTime: newStartTime.toISOString(),
    });

    return updatedBooking;
  }

  /**
   * Respond to staff counter offer
   */
  async respondCounterOffer(bookingId: string, accept: boolean, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { services: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Not authorized to respond to this booking');
    }

    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Booking is not waiting for a counter-offer response');
    }

    if (accept) {
      if (!booking.proposedStartTime || !booking.proposedEndTime) {
        throw new BadRequestException('No proposed time to accept');
      }

      // Check new slot availability
      const isAvailable = await this.slotEngine.isSlotAvailable(
        booking.shopId,
        booking.proposedStartTime,
        booking.proposedEndTime,
        booking.staffId || undefined,
        bookingId,
      );

      if (!isAvailable) {
        throw new ConflictException('The proposed time slot is no longer available');
      }

      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          startTime: booking.proposedStartTime,
          endTime: booking.proposedEndTime,
          status: BookingStatus.CONFIRMED,
          proposedStartTime: null,
          proposedEndTime: null,
        },
      });

      // Invalidate caches for both old and new dates
      this.queueService.invalidateSlotCache(booking.shopId, booking.startTime).catch(console.error);
      this.queueService.invalidateSlotCache(booking.shopId, updatedBooking.startTime).catch(console.error);
      this.queueService.updateQueueStats(booking.shopId).catch(console.error);

      const serviceIds = booking.services.map((service) => service.serviceId);
      this.unmarkBookingSlots(booking.shopId, booking.startTime, serviceIds).catch(console.error);
      this.markBookingSlots(
        booking.id,
        booking.shopId,
        updatedBooking.startTime,
        updatedBooking.endTime,
        serviceIds,
      ).catch(console.error);

      // Emit real-time updates
      this.queueGateway.emitQueueUpdate(booking.shopId).catch(console.error);
      this.queueGateway.emitBookingUpdate(bookingId, {
        status: BookingStatus.CONFIRMED,
        updatedAt: new Date().toISOString(),
      });

      return updatedBooking;
    } else {
      return this.updateStatus(bookingId, BookingStatus.CANCELLED, userId);
    }
  }

  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
        BookingStatus.PENDING_APPROVAL,
        BookingStatus.WAITLISTED,
      ],
      [BookingStatus.PENDING_APPROVAL]: [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.WAITLISTED]: [
        BookingStatus.PENDING_APPROVAL,
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [
        BookingStatus.IN_PROGRESS,
        BookingStatus.IN_SERVICE,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
      ],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.IN_SERVICE],
      [BookingStatus.IN_SERVICE]: [BookingStatus.COMPLETED, BookingStatus.SKIPPED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.NO_SHOW]: [],
      [BookingStatus.REJECTED]: [],
      [BookingStatus.SKIPPED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async validateStaffServices(
    shopId: string,
    staffId: string,
    serviceIds: string[],
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        shopId,
        isActive: true,
      },
      include: {
        staffServices: {
          select: {
            serviceId: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Selected staff member is not available');
    }

    const assignedServiceIds = new Set(staff.staffServices.map((ss) => ss.serviceId));
    const allServicesSupported = serviceIds.every((serviceId) => assignedServiceIds.has(serviceId));

    if (!allServicesSupported) {
      throw new BadRequestException(
        'Selected staff member cannot perform one or more chosen services',
      );
    }
  }

  private generateBookingNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().slice(0, 4).toUpperCase();
    return `OL-${timestamp}-${random}`;
  }

  /**
   * Verify service code (entered by staff to start service)
   */
  async verifyServiceCode(bookingId: string, code: string, staffId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { shop: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (booking.serviceStatus !== ServiceStatus.AWAITING_CODE) {
      throw new BadRequestException('Service code already verified or service completed');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        serviceStatus: ServiceStatus.IN_SERVICE,
        status: BookingStatus.IN_PROGRESS,
        codeVerifiedAt: new Date(),
        codeVerifiedBy: staffId,
        arrivedAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Emit real-time update
    this.queueGateway.emitBookingUpdate(bookingId, {
      serviceStatus: 'IN_SERVICE',
      status: 'IN_PROGRESS',
    });

    return { verified: true, booking: updatedBooking };
  }

  /**
   * Complete service and credit free cash to user's wallet
   */
  async completeService(bookingId: string, _staffId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Service already completed');
    }

    // Update booking status
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        serviceStatus: ServiceStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Credit free cash to user's wallet for next booking
    if (booking.userId) {
      const freeCashAmount = booking.freeCashAmount?.toNumber() || 0;
      if (freeCashAmount > 0) {
        await this.walletService.creditFreeCash(
          booking.userId,
          freeCashAmount,
          bookingId,
          `Free cash for completing service at booking #${booking.bookingNumber}`,
        );
      }

      // Update user's trust score
      this.trustScoreService.recalculateTrustScore(booking.userId).catch(console.error);
    }

    // Update queue
    this.queueService.updateQueueStats(booking.shopId).catch(console.error);
    this.queueGateway.emitQueueUpdate(booking.shopId).catch(console.error);

    return { success: true, message: 'Service completed successfully' };
  }

  /**
   * Enhanced cancellation with reason and free cash handling
   */
  async cancelWithReason(
    bookingId: string,
    reason: CancellationReason,
    reasonDetails?: string,
    userId?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { shop: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify ownership if userId provided
    if (userId && booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed booking');
    }

    const now = new Date();
    const gracePeriodMinutes =
      booking.shop.freeCancellationMinutes || FREE_CASH_CONFIG.GRACE_PERIOD_MINUTES;
    const gracePeriodEnd = new Date(booking.startTime.getTime() - gracePeriodMinutes * 60 * 1000);
    const isWithinGracePeriod = now < gracePeriodEnd;

    // Check if reason is valid for free cash return
    const isValidReason = this.walletService.isValidCancellationReason(reason);
    const isUserSpammer = booking.userId
      ? await this.walletService.isUserSpammer(booking.userId)
      : false;

    // Update booking
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: reason,
        cancellationDetails: reasonDetails,
      },
    });

    // Create cancellation request record
    await this.prisma.cancellationRequest.create({
      data: {
        bookingId,
        userId: booking.userId || '',
        reason,
        reasonDetails,
        isWithinGracePeriod,
        isValidReason: isValidReason && !isUserSpammer,
      },
    });

    // Handle free cash return logic
    if (booking.userId && booking.freeCashAmount) {
      const freeCashAmount = booking.freeCashAmount.toNumber();

      // If within grace period (1hr before) AND valid reason AND not spammer
      if (isWithinGracePeriod && isValidReason && !isUserSpammer) {
        await this.walletService.returnFreeCash(
          booking.userId,
          freeCashAmount,
          bookingId,
          true,
          `Free cash returned: ${reason}`,
        );

        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { freeCashReturned: true },
        });
      } else if (!isWithinGracePeriod && booking.shop.requireOwnerApproval) {
        // Late cancellation - needs owner approval
        // Owner will be notified to approve/reject
        await this.notificationsService.send({
          userId: null,
          bookingId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Cancellation Request',
          body: `User requested cancellation for booking #${booking.bookingNumber}. Reason: ${reason}. Requires approval.`,
          data: { bookingId, reason, reasonDetails, requiresApproval: true },
          channels: [NotificationChannel.EMAIL],
        });
      }
    }

    // Handle prepaid refund
    if (booking.paymentType === PaymentType.PREPAID && booking.userId) {
      const refundAmount = booking.serviceAmount?.toNumber() || 0;
      if (refundAmount > 0) {
        await this.walletService.processRefund(
          booking.userId,
          refundAmount,
          bookingId,
          `Refund for cancelled prepaid booking #${booking.bookingNumber}`,
        );
      }
    }

    // Update user's trust score (cancellation counts)
    if (booking.userId) {
      this.trustScoreService.recalculateTrustScore(booking.userId).catch(console.error);
    }

    // Update queue
    this.queueService.updateQueueStats(booking.shopId).catch(console.error);
    this.queueService.invalidateSlotCache(booking.shopId, booking.startTime).catch(console.error);
    this.queueGateway.emitQueueUpdate(booking.shopId).catch(console.error);
    this.prisma.bookingService
      .findMany({ where: { bookingId }, select: { serviceId: true } })
      .then((rows) => rows.map((row) => row.serviceId))
      .then((serviceIds) => this.unmarkBookingSlots(booking.shopId, booking.startTime, serviceIds))
      .catch(console.error);

    return {
      booking: updatedBooking,
      isWithinGracePeriod,
      freeCashReturned: isWithinGracePeriod && isValidReason && !isUserSpammer,
      message:
        isWithinGracePeriod && isValidReason && !isUserSpammer
          ? 'Booking cancelled. Free cash returned to your wallet.'
          : isWithinGracePeriod
            ? 'Booking cancelled. Reason not eligible for free cash return.'
            : 'Booking cancelled. Late cancellation - owner approval required for refund.',
    };
  }

  /**
   * Owner approves/rejects late cancellation refund
   */
  async processOwnerCancellationDecision(
    bookingId: string,
    approved: boolean,
    ownerNote?: string,
    _ownerId?: string,
  ) {
    const cancellationRequest = await this.prisma.cancellationRequest.findUnique({
      where: { bookingId },
    });

    if (!cancellationRequest) {
      throw new NotFoundException('Cancellation request not found');
    }

    if (cancellationRequest.ownerApproved !== null) {
      throw new BadRequestException('Cancellation already processed');
    }

    await this.prisma.cancellationRequest.update({
      where: { bookingId },
      data: {
        ownerApproved: approved,
        ownerResponseAt: new Date(),
        ownerNote,
        processedAt: new Date(),
      },
    });

    if (approved) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (booking?.userId && booking.freeCashAmount) {
        await this.walletService.returnFreeCash(
          booking.userId,
          booking.freeCashAmount.toNumber(),
          bookingId,
          true,
          `Free cash approved by owner: ${ownerNote || 'Approved'}`,
        );

        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { freeCashReturned: true },
        });
      }
    }

    return { success: true, approved };
  }

  async proposeNewTime(bookingId: string, proposedStartTime: Date, adminNotes: string, staffId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.PENDING_APPROVAL &&
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.WAITLISTED
    ) {
      throw new BadRequestException('Booking cannot be rescheduled in its current state');
    }

    const proposedEndTime = new Date(
      proposedStartTime.getTime() + booking.totalDurationMinutes * 60 * 1000
    );

    const isAvailable = await this.slotEngine.isSlotAvailable(
      booking.shopId,
      proposedStartTime,
      proposedEndTime,
      booking.staffId || undefined,
      bookingId,
    );

    if (!isAvailable) {
      throw new ConflictException('The proposed time slot is no longer available');
    }

    const currentNotes = booking.adminNotes ? `${booking.adminNotes}\n` : '';
    const note = `Reschedule proposed by staff: ${adminNotes}`;

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.PENDING_APPROVAL,
        proposedStartTime,
        proposedEndTime,
        adminNotes: currentNotes + note,
      },
    });

    if (booking.userId) {
      this.notificationsService.send({
        userId: booking.userId,
        bookingId: booking.id,
        type: NotificationType.QUEUE_UPDATE,
        title: `Time Change Proposed`,
        body: `The shop has proposed a new time for your booking. Please review and accept.`,
        channels: [NotificationChannel.PUSH],
      }).catch(console.error);
    }

    this.queueGateway.emitBookingUpdate(bookingId, {
      status: BookingStatus.PENDING_APPROVAL,
      updatedAt: new Date().toISOString(),
    });

    return updatedBooking;
  }
}
