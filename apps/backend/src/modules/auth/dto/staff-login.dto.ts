import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffLoginDto {
  @ApiPropertyOptional({ example: 'shop-uuid', description: 'Shop ID to authenticate against' })
  @IsString()
  @IsOptional()
  shopId?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  pin: string;
}
