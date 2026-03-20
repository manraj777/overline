import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { AuthService, TokenResponse } from '../auth/auth.service';

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
};

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  /**
   * Randomly generated 6-digit OTP for development/testing.
   * Note: Twilio is actively integrated in UsersService for primary flows.
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** Send OTP to a phone number */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<{ message: string; expiresAt: Date; devOtp: string }> {
    if (!this.isValidIndianPhone(phone)) {
      throw new BadRequestException('Invalid phone number format. Use +91XXXXXXXXXX');
    }

    // Enforce resend cooldown
    const cooldownKey = `otp:cooldown:${phone}`;
    const isInCooldown = await this.redis.get(cooldownKey);
    if (isInCooldown) {
      const remaining = await this.redis.ttl(cooldownKey);
      throw new BadRequestException(
        `Please wait ${remaining} seconds before requesting another OTP`,
      );
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    // Expire any previous active OTPs for this phone
    await this.prisma.otpVerification.updateMany({
      where: { phone, isVerified: false, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    await this.prisma.otpVerification.create({
      data: { phone, otp, purpose, expiresAt },
    });

    await this.redis.set(cooldownKey, 'active', OTP_CONFIG.RESEND_COOLDOWN_SECONDS);

    this.logger.warn(`[OTP] ${phone} → ${otp} (purpose: ${purpose})`);

    return {
      message: `OTP sent to ${phone}`,
      expiresAt,
      devOtp: otp, // Always returned until a real SMS provider is wired up
    };
  }

  /** Verify OTP */
  async verifyOtp(
    phone: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<{ verified: boolean; userId?: string }> {
    const verification = await this.prisma.otpVerification.findFirst({
      where: { phone, purpose, isVerified: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (verification.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    if (verification.otp !== otp) {
      const remaining = OTP_CONFIG.MAX_ATTEMPTS - verification.attempts - 1;
      throw new BadRequestException(`Invalid OTP. ${remaining} attempts remaining.`);
    }

    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { isVerified: true },
    });

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      });
    }

    this.logger.log(`OTP verified for ${phone}, purpose: ${purpose}`);
    return { verified: true, userId: user?.id };
  }

  /** Verify OTP then issue JWT tokens (phone-OTP login flow) */
  async loginWithOtp(phone: string, otp: string): Promise<TokenResponse> {
    const result = await this.verifyOtp(phone, otp, 'LOGIN');
    if (!result.verified) throw new BadRequestException('OTP verification failed');

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          name: `User ${phone.slice(-4)}`,
          email: `${phone.slice(3)}@phone.overline.app`,
          authProvider: 'phone',
          isPhoneVerified: true,
        },
      });
      this.logger.log(`Created new user via OTP login: ${user.id}`);
    }

    return this.authService.generateTokens(user);
  }

  /** Validate Indian phone number (+91XXXXXXXXXX / 91XXXXXXXXXX / 10 digits) */
  private isValidIndianPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return true;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return true;
    return false;
  }

  /** Normalize to +91XXXXXXXXXX */
  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    return phone;
  }
}
