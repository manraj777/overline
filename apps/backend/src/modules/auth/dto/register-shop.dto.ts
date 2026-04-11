import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantType } from '@prisma/client';

export class RegisterShopDto {
  // ── Owner Details ──
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

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  ownerPhone?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  phoneVerified?: boolean;

  // ── Shop Identity ──
  @ApiProperty({ example: 'My Awesome Shop' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  shopName: string;

  @ApiProperty({ enum: TenantType, example: TenantType.SALON })
  @IsEnum(TenantType)
  @IsNotEmpty()
  shopType: TenantType;

  @ApiPropertyOptional({ example: 'Premium salon offering expert cuts and coloring.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  shopDescription?: string;

  // ── Contact (Separated: Owner vs Public) ──
  @ApiPropertyOptional({ example: '+919876543210', description: 'Customer-facing phone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Public shop contact number' })
  @IsString()
  @IsOptional()
  publicPhone?: string;

  @ApiPropertyOptional({ example: true, description: 'Public phone same as owner phone' })
  @IsBoolean()
  @IsOptional()
  sameAsOwnerPhone?: boolean;

  @ApiPropertyOptional({ example: '+919876543210', description: 'WhatsApp number for updates' })
  @IsString()
  @IsOptional()
  whatsappPhone?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  whatsappOptIn?: boolean;

  // ── Location (Map-selected) ──
  @ApiProperty({ example: 19.076 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiPropertyOptional({ example: 'ChIJwe1EZjDG5zsRaYxkjY_tpF0', description: 'Google Place ID' })
  @IsString()
  @IsOptional()
  googlePlaceId?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Andheri West, Mumbai, Maharashtra 400058' })
  @IsString()
  @IsOptional()
  formattedAddress?: string;

  // ── Structured Address ──
  @ApiProperty({ example: '123 Business Road' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: 'Sapphire Complex, Unit 12' })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiPropertyOptional({ example: 'Ground Floor' })
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({ example: 'Andheri West' })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'MH' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Next to HDFC Bank ATM' })
  @IsString()
  @IsOptional()
  landmark?: string;

  // ── Media ──
  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsString()
  @IsOptional()
  mainPhotoUrl?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsString()
  @IsOptional()
  coverPhotoUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  galleryUrls?: string[];
}
