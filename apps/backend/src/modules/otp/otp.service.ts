import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { AuthService, TokenResponse } from '../auth/auth.service';
import axios from 'axios';
import * as crypto from 'crypto';
import * as sgMail from '@sendgrid/mail';

export const OTP_CONFIG = {
  LENGTH: 6,
  EMAIL_EXPIRY_MINUTES: 10,
  PHONE_EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  RATE_LIMIT_HOURLY: 6,
};

export type OtpPurpose =
  | 'LOGIN'
  | 'REGISTER'
  | 'VERIFY_PHONE'
  | 'EMAIL_LOGIN'
  | 'PHONE_VERIFY';
export type OtpChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export interface VerifyOtpResult {
  verified: boolean;
  userId?: string;
}

export interface EmailVerifyResult {
  success: true;
  phoneVerificationRequired: boolean;
  userId: string;
  phone?: string | null;
  tokenResponse?: TokenResponse;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private sendgridEnabled = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      this.sendgridEnabled = true;
    }
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private async enforceRateLimit(rateLimitKey: string): Promise<void> {
    const count = await this.redis.increment(rateLimitKey, 3600);
    if (count > OTP_CONFIG.RATE_LIMIT_HOURLY) {
      const ttl = await this.redis.ttl(rateLimitKey);
      throw new BadRequestException(
        `Too many OTP requests. Try again in ${Math.max(ttl, 1)} seconds.`,
      );
    }
  }

  private async enforceCooldown(cooldownKey: string): Promise<void> {
    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      const remaining = await this.redis.ttl(cooldownKey);
      throw new BadRequestException(
        `Please wait ${Math.max(remaining, 1)} seconds before requesting another OTP.`,
      );
    }
  }

  private async createOtpRecord(params: {
    target: string;
    purpose: OtpPurpose;
    channel: OtpChannel;
    otp: string;
    expiryMinutes: number;
  }): Promise<Date> {
    const { target, purpose, channel, otp, expiryMinutes } = params;

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    await this.prisma.otpVerification.updateMany({
      where: {
        phone: target,
        purpose,
        isVerified: false,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });

    await this.prisma.otpVerification.create({
      data: {
        phone: target,
        otp: this.hashOtp(otp),
        purpose,
        expiresAt,
      },
    });

    this.logger.log(`OTP issued for ${target} (${purpose}/${channel})`);
    return expiresAt;
  }

  private async getLatestActiveOtp(target: string, purpose: OtpPurpose) {
    return this.prisma.otpVerification.findFirst({
      where: {
        phone: target,
        purpose,
        isVerified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async sendEmailOtpMessage(email: string, otp: string): Promise<void> {
    const fromEmail =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SENDGRID_FROM_EMAIL') ||
      'no-reply@overline.in';

    const supportEmail = this.configService.get<string>('SUPPORT_EMAIL') || 'support@overline.in';

    if (!this.sendgridEnabled) {
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        this.logger.warn(`[DEV EMAIL OTP] ${email} -> ${otp}`);
        return;
      }
      throw new InternalServerErrorException('Email OTP provider is not configured.');
    }

    await sgMail.send({
      to: email,
      from: fromEmail,
      subject: 'Your Overline login OTP',
      text: `Your OTP is ${otp}. It expires in ${OTP_CONFIG.EMAIL_EXPIRY_MINUTES} minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in ${OTP_CONFIG.EMAIL_EXPIRY_MINUTES} minutes.</p><p>If you did not request this, contact ${supportEmail}.</p>`,
    });
  }

  private async sendAuthkeyOtp(params: {
    mobile: string;
    otp: string;
    name?: string;
    channel: 'WHATSAPP' | 'SMS';
  }): Promise<void> {
    const { mobile, otp, name = 'User', channel } = params;
    const baseUrl = this.configService.get<string>('AUTHKEY_BASE_URL') || 'https://console.authkey.io';
    const apiKey = this.configService.get<string>('AUTHKEY_API_KEY');
    const smsSid = this.configService.get<string>('AUTHKEY_SMS_SID');
    const waWid = this.configService.get<string>('AUTHKEY_WA_WID');

    if (!apiKey) {
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        this.logger.warn(`[DEV ${channel} OTP] ${mobile} -> ${otp}`);
        return;
      }
      throw new InternalServerErrorException('AUTHKEY_API_KEY is not configured.');
    }

    const paramsObj: Record<string, string | number> = {
      authkey: apiKey,
      mobile: mobile.replace(/^\+/, ''),
      country_code: 91,
      name,
      otp,
    };

    if (channel === 'WHATSAPP') {
      if (!waWid) throw new InternalServerErrorException('AUTHKEY_WA_WID is not configured.');
      paramsObj.wid = waWid;
    } else {
      if (!smsSid) throw new InternalServerErrorException('AUTHKEY_SMS_SID is not configured.');
      paramsObj.sid = smsSid;
    }

    await axios.get(`${baseUrl}/request`, { params: paramsObj });
  }

  async sendEmailOtp(
    email: string,
    purpose: OtpPurpose = 'EMAIL_LOGIN',
  ): Promise<{ message: string; expiresAt: Date; retryAfterSeconds: number }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or deactivated.');
    }

    await this.enforceRateLimit(`otp:rate:email:${normalizedEmail}`);
    await this.enforceCooldown(`otp:cooldown:email:${normalizedEmail}`);

    const otp = this.generateOtp();
    const expiresAt = await this.createOtpRecord({
      target: normalizedEmail,
      purpose,
      channel: 'EMAIL',
      otp,
      expiryMinutes: OTP_CONFIG.EMAIL_EXPIRY_MINUTES,
    });

    await this.sendEmailOtpMessage(normalizedEmail, otp);
    await this.redis.set(
      `otp:cooldown:email:${normalizedEmail}`,
      '1',
      OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    );

    return {
      message: 'Email OTP sent successfully.',
      expiresAt,
      retryAfterSeconds: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    };
  }

  async verifyEmailOtp(
    email: string,
    otp: string,
    requestedRole?: string,
  ): Promise<EmailVerifyResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const record = await this.getLatestActiveOtp(normalizedEmail, 'EMAIL_LOGIN');
    if (!record) {
      throw new BadRequestException('OTP expired or not found.');
    }

    const otpHash = this.hashOtp(otp);
    if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      throw new BadRequestException('Maximum OTP attempts exceeded.');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    if (record.otp !== otpHash) {
      const remaining = OTP_CONFIG.MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(`Invalid OTP. ${Math.max(remaining, 0)} attempts remaining.`);
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { isVerified: true },
    });

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const phoneVerificationRequired = !updatedUser.isPhoneVerified;
    if (phoneVerificationRequired) {
      return {
        success: true,
        userId: updatedUser.id,
        phone: updatedUser.phone,
        phoneVerificationRequired: true,
      };
    }

    const tokenResponse = await this.authService.generateTokens(
      requestedRole ? { ...updatedUser, role: requestedRole } : updatedUser,
    );

    return {
      success: true,
      userId: updatedUser.id,
      phone: updatedUser.phone,
      phoneVerificationRequired: false,
      tokenResponse,
    };
  }

  async sendPhoneVerificationOtp(params: {
    userId: string;
    phone: string;
    channel?: 'WHATSAPP' | 'SMS';
    name?: string;
  }): Promise<{ message: string; channel: 'WHATSAPP' | 'SMS'; expiresAt: Date }> {
    const { userId, phone, channel = 'WHATSAPP', name } = params;
    const normalizedPhone = this.normalizePhone(phone);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if ((user as any).phoneVerifiedAt || user.isPhoneVerified) {
      return {
        message: 'Phone is already verified.',
        channel,
        expiresAt: new Date(),
      };
    }

    await this.enforceRateLimit(`otp:rate:phone:${userId}:${normalizedPhone}`);
    await this.enforceCooldown(`otp:cooldown:phone:${userId}:${normalizedPhone}`);

    const otp = this.generateOtp();
    const expiresAt = await this.createOtpRecord({
      target: normalizedPhone,
      purpose: 'PHONE_VERIFY',
      channel,
      otp,
      expiryMinutes: OTP_CONFIG.PHONE_EXPIRY_MINUTES,
    });

    try {
      await this.sendAuthkeyOtp({
        mobile: normalizedPhone,
        otp,
        channel,
        name,
      });
    } catch (error) {
      if (channel === 'WHATSAPP') {
        await this.sendAuthkeyOtp({
          mobile: normalizedPhone,
          otp,
          channel: 'SMS',
          name,
        });
      } else {
        throw error;
      }
    }

    const userUpdateData: any = {
      phone: normalizedPhone,
    };
    if (channel === 'WHATSAPP') {
      userUpdateData.whatsAppOtpAttempts = { increment: 1 };
    } else {
      userUpdateData.smsOtpAttempts = { increment: 1 };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: userUpdateData,
    });

    await this.redis.set(
      `otp:cooldown:phone:${userId}:${normalizedPhone}`,
      '1',
      OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    );

    return {
      message:
        channel === 'WHATSAPP'
          ? 'WhatsApp OTP sent. Use SMS resend if delivery fails.'
          : 'SMS OTP sent.',
      channel,
      expiresAt,
    };
  }

  async verifyPhoneOtpForUser(
    userId: string,
    phone: string,
    otp: string,
  ): Promise<TokenResponse> {
    const normalizedPhone = this.normalizePhone(phone);
    const record = await this.getLatestActiveOtp(normalizedPhone, 'PHONE_VERIFY');
    if (!record) {
      throw new BadRequestException('OTP expired or not found.');
    }

    const otpHash = this.hashOtp(otp);
    if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      throw new BadRequestException('Maximum OTP attempts exceeded.');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    if (record.otp !== otpHash) {
      const remaining = OTP_CONFIG.MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(`Invalid OTP. ${Math.max(remaining, 0)} attempts remaining.`);
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { isVerified: true },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: normalizedPhone,
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
        phoneVerificationChannel: 'OTP',
      },
    });

    return this.authService.generateTokens(updatedUser);
  }

  /** Send OTP to a phone number */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<{ message: string; expiresAt: Date }> {
    if (!this.isValidIndianPhone(phone)) {
      throw new BadRequestException('Invalid phone number format. Use +91XXXXXXXXXX');
    }

    const cooldownKey = `otp:cooldown:${phone}`;
    await this.enforceRateLimit(`otp:rate:${phone}`);
    await this.enforceCooldown(cooldownKey);

    const otp = this.generateOtp();
    const expiresAt = await this.createOtpRecord({
      target: phone,
      purpose,
      channel: 'SMS',
      otp,
      expiryMinutes: OTP_CONFIG.PHONE_EXPIRY_MINUTES,
    });

    await this.redis.set(cooldownKey, 'active', OTP_CONFIG.RESEND_COOLDOWN_SECONDS);

    try {
      await this.sendAuthkeyOtp({ mobile: phone, otp, channel: 'SMS' });
    } catch (error) {
      if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
        throw error;
      }
      this.logger.warn(`[DEV OTP FALLBACK] ${phone} -> ${otp}`);
    }

    return {
      message: `OTP sent to ${phone}`,
      expiresAt,
    };
  }

  /** Verify OTP */
  async verifyOtp(phone: string, otp: string, purpose: OtpPurpose): Promise<VerifyOtpResult> {
    const verification = await this.getLatestActiveOtp(phone, purpose);

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

    if (this.hashOtp(otp) !== verification.otp) {
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
        data: {
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          phoneVerificationChannel: 'OTP',
        },
      });
    }

    this.logger.log(`OTP verified for ${phone}, purpose: ${purpose}`);
    return { verified: true, userId: user?.id };
  }

  /** Verify OTP then issue JWT tokens (phone-OTP login flow) */
  async loginWithOtp(phone: string, otp: string, requestedRole?: string): Promise<TokenResponse> {
    const result = await this.verifyOtp(phone, otp, 'LOGIN');
    if (!result.verified) throw new BadRequestException('OTP verification failed');

    // Delegate to AuthService for role-aware token issuance after OTP has already been verified.
    return this.authService.loginWithVerifiedPhone(phone, requestedRole);
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
