import { IsString, IsOptional, IsBoolean, IsArray, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkingHoursDto {
  @ApiPropertyOptional({ description: 'Opening time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format' })
  openTime?: string;

  @ApiPropertyOptional({ description: 'Closing time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format' })
  closeTime?: string;

  @ApiPropertyOptional({ description: 'Is closed for this day' })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ description: 'Break windows', type: 'array' })
  @IsOptional()
  @IsArray()
  breakWindows?: Array<{ start: string; end: string }>;
}
