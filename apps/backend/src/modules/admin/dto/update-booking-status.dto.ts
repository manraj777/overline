import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus, description: 'New status' })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Proposed Start Time for Reschedule' })
  @IsOptional()
  @IsString()
  proposedStartTime?: string;

  @ApiPropertyOptional({ description: 'Proposed End Time for Reschedule' })
  @IsOptional()
  @IsString()
  proposedEndTime?: string;
}
