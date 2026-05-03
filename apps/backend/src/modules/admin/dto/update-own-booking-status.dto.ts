import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOwnBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completionCode?: string;

  @ApiPropertyOptional({ description: 'Proposed Start Time for Reschedule' })
  @IsOptional()
  @IsString()
  proposedStartTime?: string;

  @ApiPropertyOptional({ description: 'Proposed End Time for Reschedule' })
  @IsOptional()
  @IsString()
  proposedEndTime?: string;
}
