import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HandleOverrunDto {
  @ApiProperty({ description: 'Booking ID causing the overrun' })
  @IsString()
  bookingId!: string;

  @ApiProperty({ description: 'Additional minutes to add to current booking', minimum: 5, maximum: 120 })
  @IsInt()
  @Min(5)
  @Max(120)
  extraMinutes!: number;

  @ApiPropertyOptional({ description: 'Optional overrun note' })
  @IsOptional()
  @IsString()
  note?: string;
}
