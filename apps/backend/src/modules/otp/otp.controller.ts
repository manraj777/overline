import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService, OtpPurpose } from './otp.service';
import { IsString, IsIn, IsNotEmpty, IsOptional, Matches } from 'class-validator';

class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91|91)?[6-9]\d{9}$/, {
    message: 'Invalid Indian phone number',
  })
  phone: string;

  @IsString()
  @IsIn(['LOGIN', 'REGISTER', 'VERIFY_PHONE'])
  purpose: OtpPurpose;
}

class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @IsString()
  @IsIn(['LOGIN', 'REGISTER', 'VERIFY_PHONE'])
  purpose: OtpPurpose;

  @IsOptional()
  @IsString()
  @IsIn(['OWNER', 'STAFF', 'USER', 'SUPER_ADMIN'])
  requestedRole?: string;
}

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  /**
   * Send OTP to phone number
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    return this.otpService.sendOtp(normalizedPhone, dto.purpose);
  }

  /**
   * Verify OTP
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    // If purpose is LOGIN, delegate to loginWithOtp for token generation + role enforcement
    if (dto.purpose === 'LOGIN') {
      return this.otpService.loginWithOtp(normalizedPhone, dto.otp, dto.requestedRole);
    }
    return this.otpService.verifyOtp(normalizedPhone, dto.otp, dto.purpose);
  }

  /**
   * Login with OTP (sends OTP and then verifies)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginWithOtp(@Body() dto: VerifyOtpDto) {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    return this.otpService.loginWithOtp(normalizedPhone, dto.otp, dto.requestedRole);
  }
}
