import { Body, Controller, Post } from '@nestjs/common';
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

  @ApiOperation({ summary: 'Send OTP via WhatsApp' })
  @Post('send-otp')
  sendOtp(@Body('phone') phone: string) {
    if (!phone) throw new Error('Phone is required');
    const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone;
    return this.whatsappOtpService.sendOtp(normalizedPhone);
  }

  @ApiOperation({ summary: 'Verify WhatsApp OTP' })
  @Post('verify-otp')
  async verifyOtp(@Body() body: { phone: string; otp: string }) {
    if (!body.phone || !body.otp) throw new Error('Phone and OTP are required');
    const normalizedPhone = body.phone.startsWith('+') ? body.phone.slice(1) : body.phone;
    await this.whatsappOtpService.verifyOtp(normalizedPhone, body.otp);
    return this.authService.loginWithVerifiedPhone(normalizedPhone);
  }
}
