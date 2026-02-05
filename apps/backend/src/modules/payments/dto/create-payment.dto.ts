import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Booking ID to pay for' })
  @IsString()
  bookingId: string;

  @ApiPropertyOptional({ enum: PaymentProvider, description: 'Payment provider' })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
