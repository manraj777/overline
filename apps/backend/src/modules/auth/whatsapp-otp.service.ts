import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class WhatsappOtpService {
  constructor(private readonly redis: RedisService) {}

  private otpKey(phone: string) {
    return `wa_otp:${phone}`;
  }

  private hashOtp(otp: string) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phone: string) {
    const otp = this.generateOtp();
    const ttl = Number(process.env.WHATSAPP_OTP_TTL_SECONDS || 300);

    await this.redis.set(
      this.otpKey(phone),
      JSON.stringify({
        hash: this.hashOtp(otp),
        attempts: 0,
      }),
      ttl,
    );

    const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'otp_verification';
    const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

    if (!waToken || !phoneId) {
      console.error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in env');
      throw new BadRequestException('WhatsApp config missing');
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLanguage },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: otp }],
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err: any) {
      console.error('Failed to send WhatsApp OTP:', err.response?.data || err.message);
      throw new BadRequestException('Failed to send OTP via WhatsApp');
    }

    return { success: true };
  }

  async verifyOtp(phone: string, otp: string) {
    const raw = await this.redis.get(this.otpKey(phone));
    if (!raw) throw new BadRequestException('OTP expired or not found');

    const data = JSON.parse(raw);
    const maxAttempts = Number(process.env.WHATSAPP_OTP_MAX_ATTEMPTS || 5);

    if (data.attempts >= maxAttempts) {
      await this.redis.del(this.otpKey(phone));
      throw new UnauthorizedException('Too many attempts');
    }

    if (data.hash !== this.hashOtp(otp)) {
      data.attempts += 1;
      const ttlRemaining = await this.redis.ttl(this.otpKey(phone));
      await this.redis.set(this.otpKey(phone), JSON.stringify(data), Math.max(ttlRemaining, 1));
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.del(this.otpKey(phone));
    return { success: true, verified: true };
  }
}
