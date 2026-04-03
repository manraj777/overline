import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateStaffProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(180)
  notifReminderMins?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(180)
  notifCallAheadMins?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifNewBooking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifLocationShare?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifReview?: boolean;
}
