import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantType } from '@prisma/client';

export class RegisterShopDto {
  @ApiProperty({ example: 'john.owner@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John Owner' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'My Awesome Shop' })
  @IsString()
  @IsNotEmpty()
  shopName: string;

  @ApiProperty({ enum: TenantType, example: TenantType.SALON })
  @IsEnum(TenantType)
  @IsNotEmpty()
  shopType: TenantType;

  @ApiProperty({ example: '123 Business Road' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'MH' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: '+91 9876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  // Mandatory coordinates for map integration
  @ApiProperty({ example: 19.076 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
