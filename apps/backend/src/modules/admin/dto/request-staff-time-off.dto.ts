import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class RequestStaffTimeOffDto {
  @ApiProperty()
  @IsString()
  startDate!: string;

  @ApiProperty()
  @IsString()
  endDate!: string;

  @ApiProperty()
  @IsBoolean()
  isFullDay!: boolean;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high'] })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'high'])
  urgency?: 'low' | 'normal' | 'high';
}
