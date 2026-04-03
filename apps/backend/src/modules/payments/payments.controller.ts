import { Controller, Post, Get, Body, Param, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PaymentsService, PaymentOrderMethod } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateOrderDto extends CreatePaymentDto {
  @ApiPropertyOptional({
    enum: ['ONLINE', 'WALLET', 'PAY_AT_SHOP'],
    description: 'Payment method',
  })
  @IsOptional()
  @IsEnum(['ONLINE', 'WALLET', 'PAY_AT_SHOP'] as const)
  method?: PaymentOrderMethod;
}

class VerifyRazorpayDto {
  @ApiProperty() @IsString() razorpay_order_id: string;
  @ApiProperty() @IsString() razorpay_payment_id: string;
  @ApiProperty() @IsString() razorpay_signature: string;
}

class RefundDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create payment order (Razorpay/Stripe/Wallet/PayAtShop)' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.createOrder(dto, userId);
  }

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent (legacy alias)' })
  async createPaymentIntent(@Body() dto: CreatePaymentDto, @CurrentUser('id') userId: string) {
    return this.paymentsService.createPaymentIntent(dto, userId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verifyRazorpay(@Body() dto: VerifyRazorpayDto) {
    return this.paymentsService.verifyRazorpayPayment(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async getPayment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paymentsService.getPayment(id, userId);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async stripeWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const payload = (req as any).rawBody || req.body;
    return this.paymentsService.handleStripeWebhook(payload, signature);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async refundPayment(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refundPayment(id, dto.reason);
  }
}
