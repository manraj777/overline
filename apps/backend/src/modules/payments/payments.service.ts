import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentStatus, PaymentProvider, BookingStatus } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2026-01-28.clover',
      });
    }
  }

  /**
   * Create a Stripe PaymentIntent for a booking
   */
  async createPaymentIntent(dto: CreatePaymentDto, userId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Payment processing is not configured. Add STRIPE_SECRET_KEY to enable payments.');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { 
        payment: true,
        shop: true,
        services: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    // Check if payment already exists and is completed
    if (booking.payment?.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already completed');
    }

    // Amount in smallest currency unit (paise for INR, cents for USD)
    const amount = Math.round(booking.totalAmount.toNumber() * 100);
    const currency = booking.currency.toLowerCase();

    try {
      // Create Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          shopId: booking.shopId,
          userId: userId,
        },
        description: `Booking ${booking.bookingNumber} at ${booking.shop.name}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create or update payment record
      const payment = await this.prisma.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          provider: PaymentProvider.STRIPE,
          amount: booking.totalAmount,
          currency: booking.currency,
          status: PaymentStatus.PENDING,
          providerOrderId: paymentIntent.id,
        },
        update: {
          providerOrderId: paymentIntent.id,
          status: PaymentStatus.PENDING,
        },
      });

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: booking.totalAmount,
        currency: booking.currency,
      };
    } catch (error) {
      this.logger.error('Failed to create PaymentIntent', error);
      throw new BadRequestException('Failed to create payment');
    }
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
            shop: {
              select: { name: true },
            },
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

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret!);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      this.logger.warn('No bookingId in payment metadata');
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { bookingId },
        data: {
          status: PaymentStatus.COMPLETED,
          transactionRef: paymentIntent.id,
          paidAt: new Date(),
        },
      });

      // Update booking status to confirmed (if pending)
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
        },
      });
    });

    this.logger.log(`Payment completed for booking: ${bookingId}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) return;

    await this.prisma.payment.update({
      where: { bookingId },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    this.logger.log(`Payment failed for booking: ${bookingId}`);
  }

  /**
   * Handle refund
   */
  private async handleRefund(charge: Stripe.Charge) {
    const paymentIntentId = charge.payment_intent as string;
    
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: paymentIntentId },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, reason?: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    try {
      await this.stripe.refunds.create({
        payment_intent: payment.providerOrderId!,
        reason: 'requested_by_customer',
      });

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REFUNDED },
      });

      return { success: true, message: 'Refund initiated' };
    } catch (error) {
      this.logger.error('Failed to process refund', error);
      throw new BadRequestException('Failed to process refund');
    }
  }
}
