import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentStatus, PaymentProvider, BookingStatus, PaymentMethod } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';

export type PaymentOrderMethod = 'ONLINE' | 'WALLET' | 'PAY_AT_SHOP';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;
  private razorpayKeyId: string | null = null;
  private razorpaySecret: string | null = null;
  private razorpayRouteEnabled = false;
  private razorpayAccountNumber: string | null = null;
  private platformFeePercent = 2;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Stripe setup
    const stripeKey = this.configService.get<string>('payments.stripe.secretKey');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' as any });
      this.logger.log('Stripe payment provider configured');
    }

    // Razorpay setup
    this.razorpayKeyId = this.configService.get<string>('payments.razorpay.keyId') || null;
    this.razorpaySecret = this.configService.get<string>('payments.razorpay.keySecret') || null;
    this.razorpayRouteEnabled =
      this.configService.get<boolean>('payments.razorpay.routeEnabled') || false;
    this.razorpayAccountNumber =
      this.configService.get<string>('payments.razorpay.accountNumber') || null;
    this.platformFeePercent =
      this.configService.get<number>('payments.fees.platformFeePercent') || 2;
    if (this.razorpayKeyId && this.razorpayKeyId !== 'REPLACE_ME') {
      this.logger.log('Razorpay payment provider configured');
    }
  }

  /**
   * Create a payment order — supports ONLINE (Razorpay/Stripe), WALLET, PAY_AT_SHOP
   */
  async createOrder(dto: CreatePaymentDto & { method?: PaymentOrderMethod }, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { payment: true, shop: true, services: true, staffProfile: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new NotFoundException('Booking not found');
    if (booking.payment?.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already completed');
    }

    const method = dto.method || 'ONLINE';
    const amount = booking.totalAmount.toNumber();
    const amountInPaise = Math.round(amount * 100);

    // ── PAY_AT_SHOP ──
    if (method === 'PAY_AT_SHOP') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            provider: PaymentProvider.CASH,
            amount: booking.totalAmount,
            currency: booking.currency,
            status: PaymentStatus.PENDING,
          },
          update: { status: PaymentStatus.PENDING, provider: PaymentProvider.CASH },
        });
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED, paymentType: 'PAY_LATER' },
        });
      });

      return {
        method: 'PAY_AT_SHOP',
        status: 'confirmed',
        message: 'Booking confirmed. Pay at the shop after your service.',
      };
    }

    // ── WALLET ──
    if (method === 'WALLET') {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance.toNumber() < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: amount },
            totalSpent: { increment: amount },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            bookingId: booking.id,
            type: 'FREE_CASH_DEBIT',
            amount,
            previousBalance: wallet.balance,
            newBalance: wallet.balance.toNumber() - amount,
            description: `Payment for booking ${booking.bookingNumber}`,
          },
        });
        await tx.payment.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            provider: PaymentProvider.CASH, // Using CASH for wallet payments
            amount: booking.totalAmount,
            currency: booking.currency,
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
          update: { status: PaymentStatus.COMPLETED, paidAt: new Date() },
        });
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED, paymentType: 'PREPAID' },
        });
      });

      return {
        method: 'WALLET',
        status: 'completed',
        message: 'Payment successful from wallet balance.',
      };
    }

    // ── ONLINE (Razorpay preferred, Stripe fallback) ──
    if (this.razorpayKeyId && this.razorpaySecret && this.razorpayKeyId !== 'REPLACE_ME') {
      return this.createRazorpayOrder(booking, amountInPaise, userId);
    }

    if (this.stripe) {
      return this.createStripePaymentIntent(booking, amountInPaise, userId);
    }

    throw new BadRequestException(
      'No payment provider configured. Please use PAY_AT_SHOP or WALLET.',
    );
  }

  /**
   * Create Razorpay order
   */
  private async createRazorpayOrder(booking: any, amountInPaise: number, userId: string) {
    const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpaySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: booking.currency || 'INR',
        receipt: booking.bookingNumber,
        notes: {
          bookingId: booking.id,
          userId,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Razorpay order creation failed: ${errText}`);
      throw new BadRequestException('Failed to create payment order');
    }

    const order: any = await response.json();

    await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        provider: PaymentProvider.RAZORPAY,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: PaymentStatus.PROCESSING,
        providerOrderId: order.id,
      },
      update: {
        providerOrderId: order.id,
        status: PaymentStatus.PROCESSING,
        provider: PaymentProvider.RAZORPAY,
      },
    });

    return {
      method: 'RAZORPAY',
      orderId: order.id,
      amount: amountInPaise,
      currency: booking.currency || 'INR',
      keyId: this.razorpayKeyId,
      bookingNumber: booking.bookingNumber,
      shopName: booking.shop?.name,
    };
  }

  /**
   * Verify Razorpay payment signature
   */
  async verifyRazorpayPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    // Verify HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpaySecret || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      this.logger.error('Razorpay signature verification failed');
      throw new BadRequestException('Payment verification failed');
    }

    // Find payment by order ID
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: razorpay_order_id },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          providerPaymentId: razorpay_payment_id,
          transactionRef: razorpay_payment_id,
          paidAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentType: 'PREPAID',
        },
      });
    });

    this.logger.log(`Razorpay payment verified: ${razorpay_payment_id}`);

    await this.processStaffPayoutForOnlinePayment(payment.bookingId, razorpay_payment_id);

    return {
      status: 'success',
      message: 'Payment verified and booking confirmed',
      bookingId: payment.bookingId,
    };
  }

  /**
   * Create a Stripe PaymentIntent (fallback)
   */
  private async createStripePaymentIntent(booking: any, amountInSmallest: number, userId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInSmallest,
      currency: (booking.currency || 'INR').toLowerCase(),
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        shopId: booking.shopId,
        userId,
      },
      description: `Booking ${booking.bookingNumber} at ${booking.shop?.name}`,
      automatic_payment_methods: { enabled: true },
    });

    await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        provider: PaymentProvider.STRIPE,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: PaymentStatus.PENDING,
        providerOrderId: paymentIntent.id,
      },
      update: { providerOrderId: paymentIntent.id, status: PaymentStatus.PENDING },
    });

    return {
      method: 'STRIPE',
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: booking.totalAmount,
      currency: booking.currency,
    };
  }

  // Legacy alias
  async createPaymentIntent(dto: CreatePaymentDto, userId: string) {
    return this.createOrder({ ...dto, method: 'ONLINE' }, userId);
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            userId: true,
            totalAmount: true,
            shop: { select: { name: true } },
          },
        },
      },
    });

    if (!payment || payment.booking.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(payload: Buffer, signature: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const webhookSecret = this.configService.get<string>('payments.stripe.webhookSecret');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret!);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata.bookingId;
        if (bookingId) {
          await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { bookingId },
              data: { status: PaymentStatus.COMPLETED, transactionRef: pi.id, paidAt: new Date() },
            });
            await tx.booking.update({
              where: { id: bookingId },
              data: { status: BookingStatus.CONFIRMED },
            });
          });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata.bookingId;
        if (bookingId) {
          await this.prisma.payment.update({
            where: { bookingId },
            data: { status: PaymentStatus.FAILED },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  /**
   * Refund a payment (Razorpay or Stripe)
   */
  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    // Razorpay refund
    if (payment.provider === PaymentProvider.RAZORPAY && payment.providerPaymentId) {
      if (!this.razorpayKeyId || !this.razorpaySecret) {
        throw new BadRequestException('Razorpay is not configured for refunds');
      }
      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpaySecret}`).toString('base64');
      const response = await fetch(
        `https://api.razorpay.com/v1/payments/${payment.providerPaymentId}/refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: Math.round(payment.amount.toNumber() * 100),
            notes: { reason: reason || 'Customer requested refund' },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Razorpay refund failed: ${errText}`);
        throw new BadRequestException('Failed to process refund');
      }
    }

    // Stripe refund
    if (payment.provider === PaymentProvider.STRIPE && this.stripe && payment.providerOrderId) {
      await this.stripe.refunds.create({
        payment_intent: payment.providerOrderId,
        reason: 'requested_by_customer',
      });
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });

    return { success: true, message: 'Refund initiated' };
  }

  private toPaise(amountInMajorUnits: number): number {
    return Math.max(0, Math.round(amountInMajorUnits * 100));
  }

  private async processStaffPayoutForOnlinePayment(
    bookingId: string,
    razorpayPaymentId: string,
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        staffProfile: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!booking || !booking.staffProfileId) {
      return;
    }

    const serviceAmount =
      typeof booking.serviceAmount?.toNumber === 'function'
        ? booking.serviceAmount.toNumber()
        : booking.totalAmount.toNumber();

    const grossPaise = this.toPaise(serviceAmount);
    const platformFeePaise = Math.round((grossPaise * this.platformFeePercent) / 100);
    const netPaise = Math.max(0, grossPaise - platformFeePaise);

    await this.prisma.earning.upsert({
      where: { bookingId: booking.id },
      create: {
        shopId: booking.shopId,
        staffProfileId: booking.staffProfileId,
        bookingId: booking.id,
        amount: grossPaise,
        platformFee: platformFeePaise,
        netAmount: netPaise,
        paymentMethod: PaymentMethod.RAZORPAY,
      },
      update: {
        amount: grossPaise,
        platformFee: platformFeePaise,
        netAmount: netPaise,
        paymentMethod: PaymentMethod.RAZORPAY,
      },
    });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentId: razorpayPaymentId,
        amount: grossPaise,
        platformFee: platformFeePaise,
        staffEarning: netPaise,
      },
    });

    if (!this.razorpayRouteEnabled || !this.razorpayKeyId || !this.razorpaySecret) {
      return;
    }

    const fundAccountId = await this.ensureStaffFundAccount(booking.staffProfileId);
    if (!fundAccountId) {
      return;
    }

    const transferId = await this.createRazorpayPayout(
      fundAccountId,
      netPaise,
      booking.bookingNumber,
      razorpayPaymentId,
    );

    if (!transferId) {
      return;
    }

    await this.prisma.earning.update({
      where: { bookingId: booking.id },
      data: {
        settledAt: new Date(),
        razorpayTransferId: transferId,
      },
    });
  }

  private async ensureStaffFundAccount(staffProfileId: string): Promise<string | null> {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { id: staffProfileId },
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
    });

    if (!profile?.upiId) {
      return null;
    }

    if (profile.fundAccountId) {
      return profile.fundAccountId;
    }

    const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpaySecret}`).toString('base64');

    let contactId = profile.razorpayContactId;
    if (!contactId) {
      const contactResponse = await fetch('https://api.razorpay.com/v1/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          name: profile.user.name || profile.displayName || `staff-${profile.id}`,
          email: profile.user.email || undefined,
          contact: profile.user.phone || undefined,
          type: 'employee',
          reference_id: profile.id,
          notes: {
            staffProfileId: profile.id,
            source: 'overline_phase9',
          },
        }),
      });

      if (!contactResponse.ok) {
        const errorText = await contactResponse.text();
        this.logger.warn(`Unable to create Razorpay contact for staff ${profile.id}: ${errorText}`);
        return null;
      }

      const contactPayload: any = await contactResponse.json();
      contactId = contactPayload.id;
    }

    const fundAccountResponse = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        contact_id: contactId,
        account_type: 'vpa',
        vpa: {
          address: profile.upiId,
        },
      }),
    });

    if (!fundAccountResponse.ok) {
      const errorText = await fundAccountResponse.text();
      this.logger.warn(`Unable to create fund account for staff ${profile.id}: ${errorText}`);
      await this.prisma.staffProfile.update({
        where: { id: profile.id },
        data: {
          razorpayContactId: contactId,
          upiVerificationStatus: 'FAILED',
          payoutPreference: 'UPI',
        },
      });
      return null;
    }

    const fundAccountPayload: any = await fundAccountResponse.json();
    const fundAccountId = fundAccountPayload.id as string;

    const verificationStatus = this.razorpayAccountNumber ? 'PENDING' : 'UNAVAILABLE';
    await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: {
        razorpayContactId: contactId,
        fundAccountId,
        payoutPreference: 'UPI',
        upiVerificationStatus: verificationStatus,
        contactMetadata: {
          contactCreatedAt: new Date().toISOString(),
          fundAccountCreatedAt: new Date().toISOString(),
        },
      },
    });

    if (this.razorpayAccountNumber) {
      const pennyTransferId = await this.createRazorpayPayout(
        fundAccountId,
        100,
        `verify-${profile.id}`,
        'penny-drop',
      );

      await this.prisma.staffProfile.update({
        where: { id: profile.id },
        data: {
          upiVerified: Boolean(pennyTransferId),
          upiVerificationStatus: pennyTransferId ? 'VERIFIED' : 'FAILED',
        },
      });
    }

    return fundAccountId;
  }

  private async createRazorpayPayout(
    fundAccountId: string,
    amountInPaise: number,
    bookingReference: string,
    sourceReference: string,
  ): Promise<string | null> {
    if (!this.razorpayAccountNumber || !this.razorpayKeyId || !this.razorpaySecret) {
      return null;
    }

    const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpaySecret}`).toString('base64');
    const payoutResponse = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        account_number: this.razorpayAccountNumber,
        fund_account_id: fundAccountId,
        amount: amountInPaise,
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `${bookingReference}-${Date.now()}`,
        narration: `Overline payout ${sourceReference}`,
      }),
    });

    if (!payoutResponse.ok) {
      const errorText = await payoutResponse.text();
      this.logger.warn(`Razorpay payout failed: ${errorText}`);
      return null;
    }

    const payoutPayload: any = await payoutResponse.json();
    return payoutPayload.id || null;
  }
}
