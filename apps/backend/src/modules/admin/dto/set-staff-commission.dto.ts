import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SetStaffCommissionDto {
  @ApiProperty({ enum: ['percentage', 'flat'] })
  @IsString()
  @IsIn(['percentage', 'flat'])
  commissionType!: 'percentage' | 'flat';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  commissionValue!: number;

  @ApiProperty()
  @IsString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}
