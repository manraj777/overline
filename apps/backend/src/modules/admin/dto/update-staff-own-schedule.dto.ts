import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateStaffOwnScheduleDto {
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
