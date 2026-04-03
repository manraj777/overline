import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CallAheadDto {
  @ApiProperty({ description: 'Booking ID to call ahead' })
  @IsString()
  bookingId!: string;

  @ApiPropertyOptional({ description: 'Optional note/message for call-ahead action' })
  @IsOptional()
  @IsString()
  message?: string;
}
