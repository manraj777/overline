import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Phone number in E.164 format, e.g. +919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({
    description: 'Requested role context for role-safe OTP login (OWNER, STAFF, USER, SUPER_ADMIN)',
    required: false,
    example: 'OWNER',
  })
  @IsOptional()
  @IsEnum(['OWNER', 'STAFF', 'USER', 'SUPER_ADMIN'])
  requestedRole?: string;
}
