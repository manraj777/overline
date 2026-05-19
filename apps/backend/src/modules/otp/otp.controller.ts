import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, Res, Ip } from '@nestjs/common';
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

class SendEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

class VerifyEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp: string;

  @IsOptional()
  @IsString()
  @IsIn(['OWNER', 'STAFF', 'USER', 'SUPER_ADMIN'])
  requestedRole?: string;
}

class SendPhoneVerificationOtpDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91|91)?[6-9]\d{9}$/, {
    message: 'Invalid Indian phone number',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @IsIn(['WHATSAPP', 'SMS'])
  channel?: 'WHATSAPP' | 'SMS';

  @IsOptional()
  @IsString()
  name?: string;
}

class VerifyPhoneVerificationOtpDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp: string;
}

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('email/send')
  @HttpCode(HttpStatus.OK)
  async sendEmailOtp(@Body() dto: SendEmailOtpDto): Promise<any> {
    return this.otpService.sendEmailOtp(dto.email, 'EMAIL_LOGIN');
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto): Promise<any> {
    return this.otpService.verifyEmailOtp(dto.email, dto.otp, dto.requestedRole);
  }

  @Post('phone/send')
  @HttpCode(HttpStatus.OK)
  async sendPhoneVerificationOtp(@Body() dto: SendPhoneVerificationOtpDto, @Ip() ip: string): Promise<any> {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    return this.otpService.sendPhoneVerificationOtp({
      userId: dto.userId,
      phone: normalizedPhone,
      channel: dto.channel,
      name: dto.name,
      ip,
    });
  }

  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneVerificationOtp(@Body() dto: VerifyPhoneVerificationOtpDto): Promise<any> {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    return this.otpService.verifyPhoneOtpForUser(dto.userId, normalizedPhone, dto.otp);
  }

  /**
   * Send OTP to phone number
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto, @Ip() ip: string): Promise<any> {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    return this.otpService.sendOtp(normalizedPhone, dto.purpose, ip);
  }

  /**
   * Verify OTP
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<any> {
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
  async loginWithOtp(@Body() dto: VerifyOtpDto): Promise<any> {
    const normalizedPhone = this.otpService.normalizePhone(dto.phone);
    return this.otpService.loginWithOtp(normalizedPhone, dto.otp, dto.requestedRole);
  }

  /**
   * WhatsApp Webhook Verification (GET)
   * Meta sends a GET request here to verify the endpoint URL.
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: any,
  ) {
    // This token must match what you enter in the Meta Developer Console
    const VERIFY_TOKEN = 'overline_whatsapp_webhook_secret_2026';

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return res.status(HttpStatus.OK).send(challenge);
      }
    }
    return res.status(HttpStatus.FORBIDDEN).send('Invalid verify token');
  }

  /**
   * WhatsApp Webhook Events (POST)
   * Meta sends message delivery status and incoming messages here.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  receiveWebhook(@Body() body: any) {
    // You can process incoming messages or message delivery statuses here
    // For now, we just accept them to satisfy Meta's requirement
    return { status: 'received' };
  }
}
