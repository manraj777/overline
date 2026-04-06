import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateStaffOwnScheduleDto {
  @ApiPropertyOptional({ type: 'string', example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @ApiPropertyOptional({ type: 'string', example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } } })
  @IsOptional()
  intervals?: { start: string; end: string }[];

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}
