import { Body, Controller, Post, Ip } from '@nestjs/common';
import { WhatsappOtpService } from './whatsapp-otp.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth/whatsapp')
export class WhatsappOtpController {
  constructor(
    private readonly whatsappOtpService: WhatsappOtpService,
    private readonly authService: AuthService,
  ) {}

  private normalizeWaPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  @ApiOperation({ summary: 'Send OTP via WhatsApp' })
  @Post('send-otp')
  sendOtp(@Body('phone') phone: string, @Ip() ip: string) {
    if (!phone) throw new Error('Phone is required');
    const normalizedPhone = this.normalizeWaPhone(phone);
    return this.whatsappOtpService.sendOtp(normalizedPhone, ip);
  }

  @ApiOperation({ summary: 'Verify WhatsApp OTP' })
  @Post('verify-otp')
  async verifyOtp(@Body() body: { phone: string; otp: string; name?: string }) {
    if (!body.phone || !body.otp) throw new Error('Phone and OTP are required');
    const normalizedPhone = this.normalizeWaPhone(body.phone);
    await this.whatsappOtpService.verifyOtp(normalizedPhone, body.otp);
    return this.authService.loginWithVerifiedPhone(normalizedPhone, undefined, body.name);
  }
}
