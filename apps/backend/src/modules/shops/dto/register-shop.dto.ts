import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { TenantType } from '@prisma/client';

export class RegisterShopRequestDto {
  @ApiProperty({ example: 'My Awesome Shop' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  shopName!: string;

  @ApiProperty({ enum: TenantType, example: TenantType.SALON })
  @IsEnum(TenantType)
  shopType!: TenantType;

  @ApiPropertyOptional({ example: 'Premium salon with expert stylists' })
  @IsOptional()
  @IsString()
  shopDescription?: string;

  @ApiProperty({ example: 'Owner Name' })
  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsString()
  @IsNotEmpty()
  ownerEmail!: string;

  @ApiPropertyOptional({ example: '+919999999999' })
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ example: 19.076 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: '+919888888888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@shop.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com/...' })
  @IsOptional()
  @IsString()
  googleLink?: string;

  @ApiPropertyOptional({ example: '09:00 - 21:00' })
  @IsOptional()
  @IsString()
  timing?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
