import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SkipCustomerDto {
  @ApiProperty({ description: 'Booking ID to skip' })
  @IsString()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Reason for skipping this customer' })
  @IsOptional()
  @IsString()
  reason?: string;
}
