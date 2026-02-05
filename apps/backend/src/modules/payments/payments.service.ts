import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentStatus, PaymentProvider, BookingStatus } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a payment order
   */
  async createPaymentOrder(dto: CreatePaymentDto, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.payment) {
      if (booking.payment.status === PaymentStatus.COMPLETED) {
        throw new BadRequestException('Payment already completed');
      }
      return booking.payment;
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: dto.provider || PaymentProvider.STRIPE,
        amount: booking.totalAmount,
        currency: booking.currency,
        status: PaymentStatus.PENDING,
      },
    });

    // In production, create order with payment provider
    // For Stripe: create PaymentIntent
    // For Razorpay: create Order

    return {
      payment,
      // Include provider-specific checkout data
      checkoutUrl: null, // Would be provider checkout URL
      clientSecret: null, // For Stripe Elements
    };
  }

  /**
   * Handle payment webhook from provider
   */
  async handleWebhook(provider: PaymentProvider, payload: any, signature: string) {
    // Verify webhook signature based on provider
    // Process payment status update

    const { paymentId, status, transactionRef } = this.parseWebhookPayload(provider, payload);

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { providerOrderId: paymentId },
        ],
      },
      include: { booking: true },
    });

    if (!payment) {
      console.error('Payment not found for webhook:', paymentId);
      return;
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        transactionRef,
        paidAt: status === PaymentStatus.COMPLETED ? new Date() : null,
      },
    });

    // Update booking status if payment successful
    if (status === PaymentStatus.COMPLETED) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            id: true,
            userId: true,
            bookingNumber: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.booking.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
      bookingNumber: payment.booking.bookingNumber,
    };
  }

  /**
   * Process refund
   */
  async refundPayment(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    // In production, call payment provider refund API

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        metadata: {
          ...(payment.metadata as object),
          refundReason: reason,
          refundedAt: new Date().toISOString(),
        },
      },
    });
  }

  private parseWebhookPayload(
    provider: PaymentProvider,
    payload: any,
  ): { paymentId: string; status: PaymentStatus; transactionRef: string } {
    // Parse webhook payload based on provider
    // This is a simplified implementation

    if (provider === PaymentProvider.STRIPE) {
      const event = payload;
      if (event.type === 'payment_intent.succeeded') {
        return {
          paymentId: event.data.object.metadata.paymentId,
          status: PaymentStatus.COMPLETED,
          transactionRef: event.data.object.id,
        };
      }
    }

    if (provider === PaymentProvider.RAZORPAY) {
      return {
        paymentId: payload.payload.payment.entity.notes.paymentId,
        status: PaymentStatus.COMPLETED,
        transactionRef: payload.payload.payment.entity.id,
      };
    }

    throw new BadRequestException('Unknown payment provider');
  }
}
