import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStaffRoleDto {
  @ApiProperty({ enum: ['OWNER', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN'] })
  @IsString()
  @IsIn(['OWNER', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN'])
  staffRole!: 'OWNER' | 'MANAGER' | 'SUPERVISOR' | 'TECHNICIAN';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
