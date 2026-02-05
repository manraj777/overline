import { IsString, IsArray, IsDateString, IsOptional, IsEnum, ArrayMinSize, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ description: 'Shop ID' })
  @IsString()
  shopId: string;

  @ApiProperty({ description: 'Array of service IDs to book', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds: string[];

  @ApiProperty({ description: 'Booking start time (ISO string)' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: 'Preferred staff member ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Customer name (for guest bookings)' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone (for guest bookings)' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Customer email (for guest bookings)' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: BookingSource, description: 'Booking source' })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;
}
