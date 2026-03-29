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

  private getSlotDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private getSlotTimeKey(date: Date): string {
    return date.toISOString().slice(11, 16);
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
      serviceIds.map((serviceId) => this.redis.del(`slot:${shopId}:${dateKey}:${serviceId}:${timeKey}`)),
    );
  }

  /**
   * Create a new booking with fraud detection
   */
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

    // A single user (by userId or phone) can only hold ONE active booking across the platform
    const activeBookingConditions: any[] = [
      {
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
      },
    ];
    if (userId) {
      activeBookingConditions.push({ userId });
    } else if (customerPhone) {
      activeBookingConditions.push({ customerPhone });
    }

    if (activeBookingConditions.length > 1) {
      const existingActiveBooking = await this.prisma.booking.findFirst({
        where: {
          AND: activeBookingConditions,
        },
      });

      if (existingActiveBooking) {
        throw new ConflictException(
          'You already have an active appointment. Please complete or cancel it before booking another.',
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

    // Check slot availability using transaction for consistency
    const booking = await this.prisma.$transaction(async (tx) => {
      // Double-check availability within transaction
      const isAvailable = await this.slotEngine.isSlotAvailable(
        shopId,
        bookingStartTime,
        bookingEndTime,
        staffId,
      );

      if (!isAvailable) {
        throw new ConflictException('Selected time slot is no longer available');
      }

      // Generate booking number and verification code
      const bookingNumber = this.generateBookingNumber();
      const verificationCode = this.generateVerificationCode();

      // Calculate free cash amount (25-30 rupees)
      const freeCashAmount = this.walletService.calculateFreeCashAmount();

      // Service amount is the actual amount owner set
      const serviceAmount = totalAmount;

      // Display amount includes free cash (what user sees initially)
      const displayAmount = totalAmount + freeCashAmount;

      // Determine payment type from DTO (default to PAY_LATER)
      const paymentType = dto.paymentType || PaymentType.PAY_LATER;

      // Determine initial status
      const status = shop.autoAcceptBookings ? BookingStatus.CONFIRMED : BookingStatus.PENDING;

      // Get queue position
      const queuePosition = await this.queueService.getQueuePosition(shopId);

      // Create booking with new fields
      const newBooking = await tx.booking.create({
        data: {
          bookingNumber,
          userId,
          shopId,
          staffId,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          totalDurationMinutes: totalDuration,
          totalAmount: displayAmount, // Total shown includes free cash
          serviceAmount: new Decimal(serviceAmount),
          freeCashAmount: new Decimal(freeCashAmount),
          displayAmount: new Decimal(displayAmount),
          paymentType,
          verificationCode,
          serviceStatus: ServiceStatus.AWAITING_CODE,
          currency,
          status,
          source,
          customerName: userId ? undefined : customerName,
          customerPhone: userId ? undefined : customerPhone,
          customerEmail: userId ? undefined : customerEmail,
          notes,
          queuePosition: queuePosition + 1,
          services: {
            create: services.map((service) => ({
              serviceId: service.id,
              serviceName: service.name,
              durationMinutes: service.durationMinutes,
              price: service.price,
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

      return newBooking;
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

  /**
   * Send notification to shop admin about new booking
   */
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

    const customerName = booking.user?.name || booking.customerName || 'Guest';
    const serviceNames = booking.services?.map((s: any) => s.serviceName).join(', ') || 'Service';
    const startTime = new Date(booking.startTime);
    const timeStr = startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    for (const admin of adminUsers) {
      await this.notificationsService.send({
        userId: admin.id,
        bookingId: booking.id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `New Booking from ${customerName}`,
        body: `${customerName} booked ${serviceNames} at ${timeStr}. Booking #${booking.bookingNumber}`,
        data: {
          bookingNumber: booking.bookingNumber,
          customerName,
          services: serviceNames,
          time: timeStr,
        },
        channels: [NotificationChannel.EMAIL],
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
   * Get first completed booking with no review
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
    return booking ? { booking } : null;
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

    if (status) {
      const now = new Date();
      if (status === 'upcoming') {
        // Upcoming = future bookings that are not completed/cancelled
        where.startTime = { gte: now };
        where.status = { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] };
      } else if (status === 'past') {
        // Past = completed, cancelled, no-show, or past start time
        where.OR = [
          {
            status: {
              in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
            },
          },
          { startTime: { lt: now } },
        ];
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
        .then((serviceIds) => this.unmarkBookingSlots(booking.shopId, booking.startTime, serviceIds))
        .catch(console.error);
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

  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [
        BookingStatus.IN_PROGRESS,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
      ],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.NO_SHOW]: [],
      [BookingStatus.REJECTED]: [],
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
}
