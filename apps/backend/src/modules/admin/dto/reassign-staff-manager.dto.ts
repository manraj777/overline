import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReassignStaffManagerDto {
  @ApiProperty()
  @IsString()
  managerId!: string;
}
