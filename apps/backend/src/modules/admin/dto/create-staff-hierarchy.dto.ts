import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateStaffHierarchyDto {
  @ApiProperty()
  @IsString()
  staffId!: string;

  @ApiProperty({ enum: ['MANAGER', 'SUPERVISOR', 'TECHNICIAN'] })
  @IsString()
  @IsIn(['MANAGER', 'SUPERVISOR', 'TECHNICIAN'])
  role!: 'MANAGER' | 'SUPERVISOR' | 'TECHNICIAN';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subordinateIds?: string[];
}
