import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  FraudDetectionService,
  FraudAssessment,
  LoginContext,
  ShopRegistrationContext,
} from '../fraud-detection/fraud-detection.service';
import { GooglePlacesService } from '../google/google-places.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';
import { RegisterShopDto } from './dto/register-shop.dto';

type UserRole = 'USER' | 'OWNER' | 'STAFF' | 'SUPER_ADMIN' | 'SUPERADMIN';
const UserRole = {
  USER: 'USER',
  OWNER: 'OWNER',
  STAFF: 'STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPERADMIN: 'SUPERADMIN',
} as const;

type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

const DayOfWeek = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;

export interface JwtPayload {
  sub: string;
  email: string | null;
  role: UserRole;
  tenantId?: string;
  shopId?: string;
  shopIds?: string[];
  staffProfileId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    role: UserRole;
    avatarUrl?: string | null;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    createdAt?: Date;
    tenantId?: string | null;
    shopId?: string | null;
    shopIds?: string[];
    staffProfileId?: string | null;
  };
}

export interface RequestContext {
  ip: string;
  userAgent: string;
}

export interface StaffShopSummary {
  id: string;
  name: string;
  address: string;
  city: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;
  
  private firebaseAuth: admin.auth.Auth | null = null;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
    private fraudDetection: FraudDetectionService,
    private googlePlaces: GooglePlacesService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('google.clientId'));
  }

  onModuleInit() {
    try {
      this.initializeFirebaseAuth();
    } catch (err) {
      this.logger.warn('Failed to initialize Firebase Admin on startup: ' + (err as Error).message);
    }
  }
    
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
    
  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+91${cleaned.slice(1)}`;
    }
    return phone;
  }

  private phoneVariants(phone: string): string[] {
    const normalized = this.normalizePhone(phone);
    const noPlus = normalized.replace(/^\+/, '');
    const local10 = normalized.startsWith('+91') ? normalized.slice(3) : normalized.replace(/^91/, '');
    return Array.from(new Set([normalized, noPlus, local10, `91${local10}`]));
  }

  private initializeFirebaseAuth(): admin.auth.Auth {
    if (this.firebaseAuth) {
      return this.firebaseAuth;
    }

    const projectId = this.configService.get<string>('firebase.projectId');
    const serviceAccountKey = this.configService.get<string>('firebase.serviceAccountKey');

    if (!projectId || !serviceAccountKey) {
      throw new InternalServerErrorException(
        'Firebase phone login is not configured on the server.',
      );
    }

    const serviceAccount = this.parseFirebaseServiceAccount(serviceAccountKey, projectId);
    const appName = `overline-backend-${projectId}`;
    const existingApp = admin.apps.find((app) => app.name === appName);
    const firebaseApp =
      existingApp ||
      admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId,
        },
        appName,
      );

    this.firebaseAuth = firebaseApp.auth();
    return this.firebaseAuth;
  }

  private parseFirebaseServiceAccount(serviceAccountKey: string, projectId: string) {
    const trimmed = serviceAccountKey.trim();
    const maybeJson = trimmed.startsWith('{');

    try {
      if (maybeJson) {
        const parsed = JSON.parse(trimmed) as admin.ServiceAccount;
        return {
          ...parsed,
          privateKey: parsed.privateKey?.replace(/\\n/g, '\n'),
          projectId: parsed.projectId || projectId,
        };
      }

      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as admin.ServiceAccount;
      return {
        ...parsed,
        privateKey: parsed.privateKey?.replace(/\\n/g, '\n'),
        projectId: parsed.projectId || projectId,
      };
    } catch {
      throw new InternalServerErrorException('Invalid Firebase service account key configuration.');
    }
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
    const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const templateName =
      this.configService.get<string>('WHATSAPP_TEMPLATE_NAME') || 'otp_verification';
    const templateLanguage =
      this.configService.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') || 'en';

    if (!accessToken || !phoneNumberId) {
      if (!isProduction) {
        this.logger.warn(`[DEV WHATSAPP OTP] ${phone}: ${otp}`);
        return;
      }

      throw new InternalServerErrorException(
        'WhatsApp API is not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
      );
    }

    // Convert to E.164 without '+' (WhatsApp API format: 91XXXXXXXXXX)
    const cleaned = phone.replace(/\D/g, '');
    const e164 =
      cleaned.length === 10
        ? `91${cleaned}`
        : cleaned.startsWith('91') && cleaned.length === 12
          ? cleaned
          : cleaned;

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: e164,
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
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(
        `WhatsApp OTP sent to ${phone} (status ${response.status})`,
      );
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `[sendWhatsAppOtp] WhatsApp API failed for ${phone} (${status || 'unknown'}): ${JSON.stringify(error?.response?.data || error?.message)}`,
      );
      throw new InternalServerErrorException('Unable to send OTP right now. Please try again.');
    }
  }

  async sendPhoneOtp(
    phone: string,
    ip?: string,
  ): Promise<{ message: string; expiresInSeconds: number; retryAfterSeconds?: number }> {
    try {
      const isRedisReady = await this.redis.ping();
      if (!isRedisReady || isRedisReady !== 'PONG') {
        throw new InternalServerErrorException('OTP service temporarily unavailable');
      }

      if (ip) {
        const ipKey = `otp:ip_rate_auth:${ip}`;
        const ipCount = await this.redis.increment(ipKey, 3600);
        if (ipCount > 10) {
          throw new BadRequestException('Too many OTP requests from this network. Try again later.');
        }
      }

      const normalizedPhone = this.normalizePhone(phone);
      const rateLimitKey = `otp:rate:${normalizedPhone}`;
      const otpRequestCount = await this.redis.increment(rateLimitKey, 3600);

      // Only enforce rate limit if Redis is actually working (non-zero count means connected)
      if (otpRequestCount > 3) {
        const ttl = await this.redis.ttl(rateLimitKey);
        throw new BadRequestException(
          `Too many OTP requests. Try again in ${Math.max(ttl, 1)} seconds.`,
        );
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 5-minute TTL
      await this.redis.set(`otp:${normalizedPhone}`, otp, 300);

      // Send OTP via WhatsApp Cloud API
      await this.sendWhatsAppOtp(normalizedPhone, otp);

      return {
        message: `OTP sent successfully to ${phone}`,
        expiresInSeconds: 300,
        retryAfterSeconds: 60,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send OTP: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Failed to send OTP');
    }
  }

  async verifyPhoneOtp(phone: string, otp: string, requestedRole?: string): Promise<TokenResponse> {
    try {
      const isRedisReady = await this.redis.ping();
      if (!isRedisReady || isRedisReady !== 'PONG') {
        throw new InternalServerErrorException('OTP service temporarily unavailable');
      }

      const normalizedPhone = this.normalizePhone(phone);

      const storedOtp = await this.redis.get(`otp:${normalizedPhone}`);
      if (!storedOtp) {
        throw new BadRequestException('OTP expired. Please request a new code.');
      }

      if (storedOtp !== otp) {
        throw new BadRequestException('Invalid OTP');
      }

      await this.redis.del(`otp:${normalizedPhone}`);

      return await this.loginWithVerifiedPhone(normalizedPhone, requestedRole);
    } catch (error: any) {
      this.logger.error(`OTP verification failed: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Verification failed');
    }
  }

  async getAssignedStaffShops(phone: string): Promise<{ phone: string; shops: StaffShopSummary[] }> {
    const normalizedPhone = this.normalizePhone(phone);
    const variants = this.phoneVariants(normalizedPhone);

    const staffRows = await this.prisma.staff.findMany({
      where: {
        isActive: true,
        OR: variants.map((p) => ({ phone: p })),
      },
      select: { shopId: true },
    });

    const shopIds = Array.from(new Set(staffRows.map((row) => row.shopId)));
    if (shopIds.length === 0) {
      return { phone: normalizedPhone, shops: [] };
    }

    const shops = await this.prisma.shop.findMany({
      where: {
        id: { in: shopIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      phone: normalizedPhone,
      shops,
    };
  }

  private async findActiveStaffForShopAndPhone(shopId: string, phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const variants = this.phoneVariants(normalizedPhone);

    const staffRows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT id, shop_id AS "shopId", user_id AS "userId", name, email, phone, password
      FROM staff
      WHERE shop_id = $1
        AND is_active = true
        AND phone IN ($2, $3, $4, $5)
      ORDER BY created_at ASC
      LIMIT 1
      `,
      shopId,
      variants[0],
      variants[1],
      variants[2],
      variants[3],
    )) as Array<{
      id: string;
      shopId: string;
      userId: string | null;
      name: string;
      email: string | null;
      phone: string | null;
      password: string | null;
    }>;

    return { normalizedPhone, staff: staffRows[0] || null };
  }

  async sendStaffLoginOtp(
    shopId: string,
    phone: string,
  ): Promise<{ message: string; expiresInSeconds: number; retryAfterSeconds?: number }> {
    const { normalizedPhone, staff } = await this.findActiveStaffForShopAndPhone(shopId, phone);
    if (!staff) {
      throw new ForbiddenException(
        'No active staff assignment found for this mobile number in the selected shop.',
      );
    }

    const rateLimitKey = `otp:rate:staff:${shopId}:${normalizedPhone}`;
    const otpRequestCount = await this.redis.increment(rateLimitKey, 3600);

    if (otpRequestCount > 3) {
      const ttl = await this.redis.ttl(rateLimitKey);
      throw new BadRequestException(
        `Too many OTP requests. Try again in ${Math.max(ttl, 1)} seconds.`,
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`otp:staff:${shopId}:${normalizedPhone}`, otp, 300);
    await this.sendWhatsAppOtp(normalizedPhone, otp);

    return {
      message: `Staff OTP sent successfully to ${phone}`,
      expiresInSeconds: 300,
      retryAfterSeconds: 60,
    };
  }

  async verifyStaffLoginOtp(shopId: string, phone: string, otp: string): Promise<TokenResponse> {
    const { normalizedPhone, staff } = await this.findActiveStaffForShopAndPhone(shopId, phone);
    if (!staff) {
      throw new ForbiddenException(
        'No active staff assignment found for this mobile number in the selected shop.',
      );
    }

    const storedOtp = await this.redis.get(`otp:staff:${shopId}:${normalizedPhone}`);
    if (!storedOtp) {
      throw new BadRequestException('OTP expired. Please request a new code.');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.del(`otp:staff:${shopId}:${normalizedPhone}`);
    let user = staff.userId
      ? await this.prisma.user.findUnique({ where: { id: staff.userId } })
      : null;
    if (!user) {
      const existingByPhone = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingByPhone && existingByPhone.role === UserRole.USER) {
        throw new ForbiddenException(
          'Access denied. This phone is linked to a customer account. Ask owner to onboard staff account.',
        );
      }

      if (existingByPhone) {
        user = await this.prisma.user.update({
          where: { id: existingByPhone.id },
          data: {
            role: UserRole.STAFF,
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      } else {
        const generatedEmail = `${normalizedPhone.replace(/\D/g, '')}.${Date.now()}@staff.overline.app`;
        user = await this.prisma.user.create({
          data: {
            name: staff.name || `Staff ${normalizedPhone.slice(-4)}`,
            email: staff.email || generatedEmail,
            phone: normalizedPhone,
            role: UserRole.STAFF,
            authProvider: 'phone',
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      }

      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { userId: user.id },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.STAFF,
          isPhoneVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    return this.generateTokens(user);
  }

  async staffPinLogin(shopId: string, phone: string, password: string): Promise<TokenResponse> {
    const { normalizedPhone, staff } = await this.findActiveStaffForShopAndPhone(shopId, phone);

    if (!/^\d{6}$/.test(password)) {
      throw new BadRequestException('PIN must be exactly 6 digits.');
    }

    if (!staff || !staff.password || staff.password !== password) {
      throw new UnauthorizedException('Invalid mobile number or PIN for this shop.');
    }

    let user = staff.userId
      ? await this.prisma.user.findUnique({ where: { id: staff.userId } })
      : null;
    if (!user) {
      const existingByPhone = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingByPhone && existingByPhone.role === UserRole.USER) {
        throw new ForbiddenException(
          'Access denied. This phone is linked to a customer account. Ask owner to onboard staff account.',
        );
      }

      if (existingByPhone) {
        user = await this.prisma.user.update({
          where: { id: existingByPhone.id },
          data: {
            role: UserRole.STAFF,
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      } else {
        const generatedEmail = `${normalizedPhone.replace(/\D/g, '')}.${Date.now()}@staff.overline.app`;
        user = await this.prisma.user.create({
          data: {
            name: staff.name || `Staff ${normalizedPhone.slice(-4)}`,
            email: staff.email || generatedEmail,
            phone: normalizedPhone,
            role: UserRole.STAFF,
            authProvider: 'phone',
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      }

      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { userId: user.id },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.STAFF,
          isPhoneVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    return this.generateTokens(user);
  }

  async loginWithVerifiedPhone(phone: string, requestedRole?: string, name?: string): Promise<TokenResponse> {
    const normalizedPhone = this.normalizePhone(phone);

    const isRequestingAdminRole =
      requestedRole === 'OWNER' || requestedRole === 'STAFF' || requestedRole === 'SUPER_ADMIN';

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        if (requestedRole === 'OWNER' && existingUser.role === UserRole.USER) {
          // Promote USER to OWNER automatically
          return tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: UserRole.OWNER,
              isPhoneVerified: true,
              lastLoginAt: new Date(),
            },
          });
        }

        if (isRequestingAdminRole && existingUser.role === UserRole.USER) {
          throw new ForbiddenException(
            'Access denied. This phone is linked to a customer account. Please use the customer app.',
          );
        }

        if (requestedRole === 'OWNER' && existingUser.role === UserRole.STAFF) {
          throw new ForbiddenException(
            'Access denied. This phone is linked to a Staff account. Please use Staff login.',
          );
        }

        if (requestedRole === 'STAFF' && existingUser.role === UserRole.OWNER) {
          throw new ForbiddenException(
            'Access denied. This phone is linked to an Owner account. Please use Owner login.',
          );
        }

        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      }

      if (requestedRole === 'STAFF') {
        const variants = this.phoneVariants(normalizedPhone);
        const staffRows = await tx.staff.findMany({
          where: {
            isActive: true,
            OR: variants.map((p) => ({ phone: p })),
          },
          orderBy: { createdAt: 'asc' },
        });

        if (staffRows.length === 0) {
          throw new ForbiddenException(
            'No staff account found for this phone number. Ask your owner to onboard you first.',
          );
        }

        const provisionedUser = await tx.user.create({
          data: {
            phone: normalizedPhone,
            isPhoneVerified: true,
            name: staffRows[0].name || null,
            email: staffRows[0].email || null,
            role: UserRole.STAFF,
            authProvider: 'phone',
            lastLoginAt: new Date(),
          },
        });

        await tx.staff.updateMany({
          where: {
            userId: null,
            isActive: true,
            OR: variants.map((p) => ({ phone: p })),
          },
          data: { userId: provisionedUser.id },
        });

        return provisionedUser;
      }

      if (requestedRole === 'OWNER') {
        // Owner registration via phone — name will be set during shop setup
        return tx.user.create({
          data: {
            phone: normalizedPhone,
            isPhoneVerified: true,
            name: name?.trim() || null,
            role: UserRole.OWNER,
            authProvider: 'phone',
            lastLoginAt: new Date(),
          },
        });
      }

      if (isRequestingAdminRole) {
        throw new ForbiddenException(
          'No admin account found for this phone number. Ask your owner to invite you first.',
        );
      }

      // New USER registration — require a proper name
      if (!name || name.trim().length < 2) {
        throw new BadRequestException('NEW_USER_SIGNUP_REQUIRED');
      }

      return tx.user.create({
        data: {
          phone: normalizedPhone,
          isPhoneVerified: true,
          name: name.trim(),
          role: UserRole.USER,
          authProvider: 'phone',
          lastLoginAt: new Date(),
        },
      });
    });

    return this.generateTokens(user);
  }

  async firebasePhoneLogin(idToken: string, requestedRole?: string, providedName?: string): Promise<TokenResponse> {
    const token = idToken?.trim();
    if (!token) {
      throw new BadRequestException('Firebase ID token is required');
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      const firebaseAuth = this.initializeFirebaseAuth();
      decodedToken = await firebaseAuth.verifyIdToken(token, true);
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Firebase token expired. Please retry phone verification.');
      }
      if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Invalid Firebase token. Please retry phone verification.');
      }
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(
        `[firebasePhoneLogin] Failed to verify Firebase token: ${error?.message || 'unknown error'}`,
      );
      throw new UnauthorizedException('Unable to verify Firebase token.');
    }

    const normalizedPhone = this.normalizePhone(decodedToken.phone_number || '');
    if (!normalizedPhone) {
      throw new BadRequestException('Firebase token does not include a phone number');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { phone: normalizedPhone },
      });

      // If user exists, promote to OWNER if requested
      if (existingUser) {
        const newRole = (requestedRole === 'OWNER' && existingUser.role === UserRole.USER) ? UserRole.OWNER : existingUser.role;
        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            role: newRole,
            isPhoneVerified: true,
            lastLoginAt: new Date(),
            authProvider:
              existingUser.authProvider === 'local' && existingUser.hashedPassword
                ? existingUser.authProvider
                : 'firebase',
          },
        });
      }

      const name = providedName?.trim() || decodedToken.name?.trim() || null;
      const roleToAssign = requestedRole === 'OWNER' ? UserRole.OWNER : UserRole.USER;

      if (!name || name.trim().length < 2) {
        throw new BadRequestException('NEW_USER_SIGNUP_REQUIRED');
      }

      return tx.user.create({
        data: {
          phone: normalizedPhone,
          isPhoneVerified: true,
          name,
          role: roleToAssign,
          authProvider: 'firebase',
          lastLoginAt: new Date(),
        },
      });
    });

    return this.generateTokens(user);
  }

  async linkFirebasePhone(userId: string, idToken: string): Promise<TokenResponse> {
    const token = idToken?.trim();
    if (!token) {
      throw new BadRequestException('Firebase ID token is required');
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      const firebaseAuth = this.initializeFirebaseAuth();
      decodedToken = await firebaseAuth.verifyIdToken(token, true);
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Firebase token expired. Please retry phone verification.');
      }
      if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Invalid Firebase token. Please retry phone verification.');
      }
      this.logger.error(`[linkFirebasePhone] Failed to verify Firebase token: ${error?.message}`);
      throw new UnauthorizedException('Unable to verify Firebase token.');
    }

    const normalizedPhone = this.normalizePhone(decodedToken.phone_number || '');
    if (!normalizedPhone) {
      throw new BadRequestException('Firebase token does not include a phone number');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const existingWithPhone = await tx.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingWithPhone && existingWithPhone.id !== userId) {
        throw new BadRequestException('This phone number is already registered to another account.');
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          phone: normalizedPhone,
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          phoneVerificationChannel: 'FIREBASE',
        },
      });
    });

    return this.generateTokens(updatedUser);
  }

  async signup(dto: SignupDto, requestContext?: RequestContext): Promise<TokenResponse> {
    // --- FRAUD DETECTION FOR SIGNUP ---
    // For signup, only check extreme patterns (rapid signups, known bad IPs)
    if (requestContext) {
      // LoginContext for potential future fraud detection
      // const fraudContext: LoginContext = {
      //   email: dto.email,
      //   ip: requestContext.ip,
      //   userAgent: requestContext.userAgent,
      //   timestamp: new Date(),
      // };

      // Check rapid signup attempts from same IP
      const signupVelocity = await this.fraudDetection['checkLoginVelocity'](
        dto.email,
        requestContext.ip,
      );
      const ipReputation = await this.fraudDetection['checkIPReputation'](requestContext.ip);

      // Only block if BOTH velocity is high AND IP is suspicious
      if (signupVelocity > 50 || ipReputation > 50) {
        console.log(
          `[FRAUD] Signup blocked - velocity: ${signupVelocity}, IP reputation: ${ipReputation}`,
          {
            email: dto.email,
            ip: requestContext.ip,
          },
        );
        await this.fraudDetection.recordSuspiciousIP(requestContext.ip, 'blocked_signup');
        throw new ForbiddenException('Too many signup attempts. Please try again later.');
      }
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists (if provided)
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Hash password
    const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // Create user
    let user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        phone: dto.phone,
        hashedPassword,
        role: UserRole.USER,
      },
    });

    // Generate OTP if phone is provided
    if (user.phone) {
      const otpCode = this.generateOtpCode();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user = await (this.prisma.user as any).update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt },
      } as any);
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  async registerShop(
    dto: RegisterShopDto,
    requestContext?: RequestContext,
  ): Promise<TokenResponse> {
    if (!dto.phoneVerified) {
      throw new BadRequestException(
        'Phone verification is required before shop owner registration.',
      );
    }

    // --- FRAUD DETECTION FOR SHOP REGISTRATION ---
    if (requestContext) {
      const fraudPhone = dto.phone || dto.ownerPhone || dto.publicPhone || '';
      const fraudContext: ShopRegistrationContext = {
        ownerEmail: dto.email,
        shopName: dto.shopName,
        address: dto.address,
        phone: fraudPhone,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
      };
      let assessment: FraudAssessment | null = null;
      try {
        assessment = await this.fraudDetection.analyzeShopRegistration(fraudContext);
      } catch (error) {
        this.logger.warn('Shop registration fraud assessment failed, continuing registration flow', {
          email: dto.email,
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }

      if (!assessment) {
        assessment = {
          riskScore: 0,
          riskLevel: 'LOW',
          action: 'ALLOW',
          signals: [],
          requiresVerification: false,
        };
      }

      // Log suspicious attempts
      if (assessment.riskLevel !== 'LOW') {
        console.log(
          `[FRAUD] Shop registration attempt - Risk: ${assessment.riskLevel}, Score: ${assessment.riskScore}`,
          {
            email: dto.email,
            shopName: dto.shopName,
            ip: requestContext.ip,
            signals: assessment.signals.map((s) => s.type),
          },
        );
      }

      if (assessment.action === 'BLOCK') {
        await this.fraudDetection.recordSuspiciousIP(
          requestContext.ip,
          'blocked_shop_registration',
        );
        throw new ForbiddenException(
          'Unable to register shop at this time. Please contact support.',
        );
      }

      if (assessment.action === 'CHALLENGE') {
        // For suspicious shop registrations, require manual verification
        throw new BadRequestException(
          'Your registration requires additional verification. Please contact support with your business documents.',
        );
      }
    }

    const email = dto.email.toLowerCase();

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.role !== UserRole.USER && existingUser.tenantId) {
      throw new ConflictException('Email already registered for another Shop Owner or Staff');
    }

    // Hash password
    const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const slug =
      dto.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    // --- GOOGLE PLACES VERIFICATION ---
    // Check if shop exists on Google to provide verified badge
    let googleVerification: {
      isVerified: boolean;
      placeId?: string;
      rating?: number;
      reviewsCount?: number;
      verifiedLocation?: { lat: number; lng: number };
    } = { isVerified: false };

    if (this.googlePlaces.isConfigured()) {
      try {
        console.log(`[ShopRegistration] Checking Google Places for: ${dto.shopName}`);
        const googleResult = await this.googlePlaces.searchShop(
          dto.shopName,
          dto.address,
          dto.city,
          dto.phone,
        );

        if (googleResult.found) {
          googleVerification = {
            isVerified: true,
            placeId: googleResult.placeId,
            rating: googleResult.rating,
            reviewsCount: googleResult.reviewsCount,
            verifiedLocation: googleResult.location,
          };
          console.log(
            `[ShopRegistration] ✓ Google verified: ${dto.shopName} (${googleResult.placeId})`,
          );
          console.log(
            `[ShopRegistration] Rating: ${googleResult.rating}/5 (${googleResult.reviewsCount} reviews)`,
          );
        } else {
          console.log(`[ShopRegistration] ✗ Not found on Google: ${dto.shopName}`);
        }
      } catch (error) {
        this.logger.warn('Google Places verification failed, continuing without verification', {
          shopName: dto.shopName,
          email: dto.email,
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }

    // Create Tenant, Shop, Owner, QueueStats, and WorkingHours in a transaction
    let user;

    try {
      user = await this.prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const tenant = await tx.tenant.create({
          data: {
            name: dto.shopName + ' Tenant',
            type: dto.shopType,
          },
        });

        // 2. Create or Update Shop Owner (User)
        const ownerPhone = dto.ownerPhone || dto.phone;
        const owner = existingUser
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: {
                name: dto.ownerName,
                phone: ownerPhone,
                hashedPassword,
                role: UserRole.OWNER,
                tenantId: tenant.id,
                isPhoneVerified: dto.phoneVerified || false,
                isEmailVerified: dto.emailVerified || false,
              },
            })
          : await tx.user.create({
              data: {
                email,
                name: dto.ownerName,
                phone: ownerPhone,
                hashedPassword,
                role: UserRole.OWNER,
                tenantId: tenant.id,
                isPhoneVerified: dto.phoneVerified || false,
                isEmailVerified: dto.emailVerified || false,
              },
            });

        // 3. Resolve contact numbers
        const publicPhone = dto.sameAsOwnerPhone ? ownerPhone : (dto.publicPhone || ownerPhone);
        const fullAddress = [dto.building, dto.floor, dto.address, dto.locality, dto.landmark]
          .filter(Boolean)
          .join(', ');

        // 4. Create Shop
        const shop = await tx.shop.create({
          data: {
            tenantId: tenant.id,
            ownerId: owner.id,
            name: dto.shopName,
            slug,
            description: dto.shopDescription || null,
            address: fullAddress || dto.address,
            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            phone: publicPhone,
            email: dto.email,
            latitude: googleVerification.verifiedLocation?.lat || dto.latitude,
            longitude: googleVerification.verifiedLocation?.lng || dto.longitude,
            logoUrl: dto.mainPhotoUrl || null,
            coverUrl: dto.coverPhotoUrl || null,
            photoUrls: dto.galleryUrls || [],
            autoAcceptBookings: false,
            maxConcurrentBookings: 1,
            // Google Verification fields
            isGoogleVerified: googleVerification.isVerified,
            googlePlaceId: dto.googlePlaceId || googleVerification.placeId,
            googleRating: googleVerification.rating,
            googleReviewsCount: googleVerification.reviewsCount || 0,
            verificationStatus: googleVerification.isVerified ? 'GOOGLE_VERIFIED' : 'PENDING',
            verifiedAt: googleVerification.isVerified ? new Date() : null,
            // Extended contact & address in settings JSON
            settings: {
              shopType: dto.shopType,
              publicPhone,
              ownerPhone: ownerPhone,
              whatsappPhone: dto.whatsappPhone || null,
              whatsappOptIn: dto.whatsappOptIn || false,
              sameAsOwnerPhone: dto.sameAsOwnerPhone || false,
              building: dto.building || null,
              floor: dto.floor || null,
              locality: dto.locality || null,
              landmark: dto.landmark || null,
              formattedAddress: dto.formattedAddress || null,
              location: dto.formattedAddress || dto.locality || dto.city || null,
            },
          },
        });

        // 4. Create Queue Stats
        await tx.queueStats.create({
          data: {
            shopId: shop.id,
            currentWaitingCount: 0,
            estimatedWaitMinutes: 0,
          },
        });

        // 5. Create Default Working Hours (Mon-Fri 09:00 to 18:00)
        const weekdays = [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ];

        for (const day of weekdays) {
          await tx.workingHours.create({
            data: {
              shopId: shop.id,
              dayOfWeek: day,
              openTime: '09:00',
              closeTime: '18:00',
              breakWindows: [],
            },
          });
        }

        await tx.workingHours.create({
          data: {
            shopId: shop.id,
            dayOfWeek: DayOfWeek.SATURDAY,
            openTime: '10:00',
            closeTime: '15:00',
            breakWindows: [],
          },
        });

        await tx.workingHours.create({
          data: {
            shopId: shop.id,
            dayOfWeek: DayOfWeek.SUNDAY,
            openTime: '09:00',
            closeTime: '18:00',
            isClosed: true,
            breakWindows: [],
          },
        });

        return owner;
      });
    } catch (error) {
      const prismaCode =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
          ? (error as { code: string }).code
          : null;

      if (prismaCode === 'P2002') {
        throw new ConflictException(
          'A shop owner with the same email/phone or shop identifier already exists.',
        );
      }
      if (prismaCode === 'P2003') {
        throw new BadRequestException('Invalid registration data. Please review and try again.');
      }

      this.logger.error('Shop registration failed', {
        email: dto.email,
        shopName: dto.shopName,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
      throw new InternalServerErrorException(error instanceof Error ? error.message : String(error));
    }

    // Generate tokens for the new owner
    return this.generateTokens(user);
  }

  async login(dto: LoginDto, requestContext?: RequestContext): Promise<TokenResponse> {
    // --- PRE-AUTH FRAUD CHECK: Only block obvious attacks ---
    if (requestContext) {
      const preAuthContext: LoginContext = {
        email: dto.email,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        timestamp: new Date(),
      };
      const preAuthAssessment = await this.fraudDetection.analyzeLogin(preAuthContext);

      // Only block CRITICAL threats before auth - let others proceed to password check
      if (preAuthAssessment.action === 'BLOCK') {
        console.log(
          `[FRAUD] Login BLOCKED pre-auth - Risk: ${preAuthAssessment.riskLevel}, Score: ${preAuthAssessment.riskScore}`,
          {
            email: dto.email,
            ip: requestContext.ip,
            signals: preAuthAssessment.signals.map((s) => s.type),
          },
        );
        await this.fraudDetection.recordSuspiciousIP(requestContext.ip, 'blocked_login');
        throw new ForbiddenException('Too many failed attempts. Please try again later.');
      }
    }

    // Find user by email
    const normalizedEmail = dto.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Record failed attempt for fraud tracking
      if (requestContext) {
        await this.fraudDetection.recordFailedLogin(dto.email);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // If user signed up via Google and has no password
    if (!user.hashedPassword) {
      throw new UnauthorizedException(
        'This account uses Google Sign-In. Please login with Google.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!isPasswordValid) {
      // Record failed attempt for fraud tracking
      if (requestContext) {
        await this.fraudDetection.recordFailedLogin(dto.email);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Owner portal rule: any successful owner-flow login is treated as OWNER.
    if (dto.requestedRole === 'OWNER' && user.role !== UserRole.OWNER) {
      const [ownedShop, tenantShop] = await Promise.all([
        this.prisma.shop.findFirst({
          where: { ownerId: user.id, isActive: true },
          select: { tenantId: true },
        }),
        user.tenantId
          ? this.prisma.shop.findFirst({
              where: { tenantId: user.tenantId, isActive: true },
              select: { tenantId: true },
            })
          : Promise.resolve(null),
      ]);

      const ownerContext = ownedShop || tenantShop;
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.OWNER,
          tenantId: user.tenantId || ownerContext?.tenantId || null,
        },
      });
    }

    // Strict UI Role Verification (Phase 5 Alignment)
    if (dto.requestedRole) {
      const isRequestingAdminRole = ['OWNER', 'STAFF', 'SUPER_ADMIN'].includes(dto.requestedRole);
      
      // Prevent a plain user from logging into the Admin web/mobile portal
      if (isRequestingAdminRole && user.role === 'USER') {
        throw new ForbiddenException('Access denied. You do not have an Owner or Staff account. Please use the standard Overline user app.');
      }
      
      // Conversely, if an Owner tries to log in via the Staff toggle
      if (dto.requestedRole === 'STAFF' && user.role === 'OWNER') {
        throw new ForbiddenException('Access denied. You attempted to log in as Staff, but you are a Shop Owner. Please select the Shop Owner tab and try again.');
      }
    }

    // --- POST-AUTH FRAUD CHECK: Now check with user ID for better accuracy ---
    if (requestContext) {
      const postAuthContext: LoginContext = {
        userId: user.id,
        email: dto.email,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
        timestamp: new Date(),
      };
      const postAuthAssessment = await this.fraudDetection.analyzeLogin(postAuthContext);

      // Log but allow - valid credentials verified
      if (postAuthAssessment.riskLevel === 'HIGH' || postAuthAssessment.riskLevel === 'CRITICAL') {
        console.log(
          `[FRAUD] Post-auth warning - Risk: ${postAuthAssessment.riskLevel}, Score: ${postAuthAssessment.riskScore}`,
          {
            userId: user.id,
            email: dto.email,
            ip: requestContext.ip,
            signals: postAuthAssessment.signals.map((s) => s.type),
          },
        );
        // Could trigger email notification, 2FA requirement, etc.
        // For now, just log and allow
      }

      // Clear failed login count on successful login
      await this.fraudDetection.clearFailedLogins(dto.email);
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    return this.generateTokens(user);
  }

  async facebookLogin(dto: FacebookLoginDto): Promise<TokenResponse> {
    let fbUserData;
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture.width(250).height(250)&access_token=${dto.accessToken}`
      );
      fbUserData = response.data;
    } catch (error: any) {
      console.error('[FacebookLogin] Error calling Facebook Graph API:', error?.response?.data || error?.message);
      throw new UnauthorizedException(
        `Invalid Facebook access token: ${error?.response?.data?.error?.message || error?.message || 'Verification failed'}`
      );
    }

    if (!fbUserData || !fbUserData.id) {
      throw new UnauthorizedException('Invalid Facebook token payload');
    }

    const facebookId = fbUserData.id;
    const email = fbUserData.email || `${facebookId}@facebook.com`;
    const name = fbUserData.name || email.split('@')[0];
    const picture = fbUserData.picture?.data?.url || null;

    const tokenResponse = await this.handleFacebookUser(
      facebookId,
      email,
      name,
      picture,
      dto.requestedRole
    );

    if (dto.requestedRole) {
      const userRole = tokenResponse.user.role;
      const isRequestingAdminRole =
        dto.requestedRole === 'OWNER' || dto.requestedRole === 'STAFF' || dto.requestedRole === 'SUPER_ADMIN';

      if (isRequestingAdminRole && userRole === UserRole.USER) {
        throw new ForbiddenException(
          'Access denied. You do not have an Owner or Staff account. Please use the customer app.',
        );
      }

      if (dto.requestedRole === 'OWNER' && userRole === UserRole.STAFF) {
        throw new ForbiddenException(
          'Access denied. This Facebook account is linked to Staff. Please use Staff login.',
        );
      }

      if (dto.requestedRole === 'STAFF' && userRole === UserRole.OWNER) {
        throw new ForbiddenException(
          'Access denied. This Facebook account is linked to Owner. Please use Owner login.',
        );
      }
    }

    return tokenResponse;
  }

  async handleFacebookUser(
    facebookId: string,
    email: string,
    name?: string,
    picture?: string,
    requestedRole?: string,
  ): Promise<TokenResponse> {
    try {
      console.log('[handleFacebookUser] Processing:', { facebookId, email, name });

      // Check if user already exists by facebookId or email
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ facebookId }, { email }],
        },
      });

      if (user) {
        console.log('[handleFacebookUser] Existing user found:', user.id);
        if (!user.isActive) {
          throw new UnauthorizedException('Account is deactivated');
        }

        const updateData: any = { lastLoginAt: new Date() };
        if (!user.facebookId) {
          updateData.facebookId = facebookId;
          updateData.authProvider = user.hashedPassword ? 'local' : 'facebook';
          updateData.avatarUrl = user.avatarUrl || picture;
        }

        if (requestedRole === 'OWNER' && user.role === UserRole.USER) {
          updateData.role = UserRole.OWNER;
        }

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      } else {
        console.log('[handleFacebookUser] Creating new user');
        user = await this.prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            facebookId,
            authProvider: 'facebook',
            avatarUrl: picture,
            isEmailVerified: true,
            role: requestedRole === 'OWNER' ? UserRole.OWNER : UserRole.USER,
          },
        });
        console.log('[handleFacebookUser] New user created:', user.id);
      }

      return this.generateTokens(user);
    } catch (error) {
      console.error('[handleFacebookUser] Error:', error);
      throw error;
    }
  }

  async googleLogin(dto: GoogleLoginDto): Promise<TokenResponse> {
    const googleClientId = this.configService.get<string>('google.clientId');

    // Decode token to find incoming audience (useful for multi-client mobile apps)
    // In strict production, keep a defined array of valid client IDs instead of trusting the token's aud.
    let audience = googleClientId;
    try {
      const parts = dto.idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && payload.aud && payload.aud.endsWith('googleusercontent.com')) {
          audience = payload.aud;
        }
      }
    } catch (e) {
      console.warn('[GoogleLogin] Could not pre-decode token audience');
    }

    // Verify the Google ID token
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience,
      });
    } catch (error: any) {
      console.error('[GoogleLogin] verifyIdToken error:', error?.message);
      throw new UnauthorizedException(
        `Invalid Google token: ${error?.message || 'Verification failed'}`,
      );
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;
    const tokenResponse = await this.handleGoogleUser(googleId, email, name, picture, email_verified);

    if (dto.requestedRole) {
      const userRole = tokenResponse.user.role;
      const isRequestingAdminRole =
        dto.requestedRole === 'OWNER' || dto.requestedRole === 'STAFF' || dto.requestedRole === 'SUPER_ADMIN';

      if (isRequestingAdminRole && userRole === UserRole.USER) {
        throw new ForbiddenException(
          'Access denied. You do not have an Owner or Staff account. Please use the customer app.',
        );
      }

      if (dto.requestedRole === 'OWNER' && userRole === UserRole.STAFF) {
        throw new ForbiddenException(
          'Access denied. This Google account is linked to Staff. Please use Staff login.',
        );
      }

      if (dto.requestedRole === 'STAFF' && userRole === UserRole.OWNER) {
        throw new ForbiddenException(
          'Access denied. This Google account is linked to Owner. Please use Owner login.',
        );
      }
    }

    return tokenResponse;
  }

  async handleGoogleUser(
    googleId: string,
    email: string,
    name?: string,
    picture?: string,
    emailVerified?: boolean,
    requestedRole?: string,
  ): Promise<TokenResponse> {
    try {
      console.log('[handleGoogleUser] Processing:', { googleId, email, name, emailVerified });
      console.log('[OAuth Step 3] DB lookup start:', { email, googleId });

      // Check if user already exists by googleId or email
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ googleId }, { email }],
        },
      });

      console.log('[OAuth Step 3] DB lookup result:', {
        found: !!user,
        userId: user?.id || null,
      });

      if (user) {
        console.log('[handleGoogleUser] Existing user found:', user.id);
        // If account is deactivated, reject before updating
        if (!user.isActive) {
          throw new UnauthorizedException('Account is deactivated');
        }

        // Combine update for efficiency: link Google account (if missing) + update last login
        const updateData: any = { lastLoginAt: new Date() };
        if (!user.googleId) {
          updateData.googleId = googleId;
          updateData.authProvider = user.hashedPassword ? 'local' : 'google';
          updateData.isEmailVerified = emailVerified || user.isEmailVerified;
          updateData.avatarUrl = user.avatarUrl || picture;
        }
        
        if (requestedRole === 'OWNER' && user.role === UserRole.USER) {
          updateData.role = UserRole.OWNER;
        }

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      } else {
        console.log('[handleGoogleUser] Creating new user');
        // New user — create account via Google
        user = await this.prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            googleId,
            authProvider: 'google',
            avatarUrl: picture,
            isEmailVerified: emailVerified || false,
            role: requestedRole === 'OWNER' ? UserRole.OWNER : UserRole.USER,
          },
        });
        console.log('[handleGoogleUser] New user created:', user.id);
      }

      return this.generateTokens(user);
    } catch (error) {
      console.error('[handleGoogleUser] Error:', error);
      console.error('[handleGoogleUser] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async staffLogin(phone: string, pin: string): Promise<TokenResponse | { mustSetPin: boolean; tempToken: string }> {
    const staffProfile = await (this.prisma as any).staffProfile.findFirst({
      where: {
        user: { phone },
        isActive: true,
        isSuspended: false,
      },
      include: {
        user: true,
      },
    });

    if (!staffProfile || !staffProfile.pin) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    const isPinValid = await bcrypt.compare(pin, staffProfile.pin);
    if (!isPinValid) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    if (staffProfile.pinMustChange) {
      // In a real implementation you would issue a temp token.
      // We will just return the flag and let the client handle.
      return { mustSetPin: true, tempToken: `temp_${staffProfile.id}` };
    }

    return this.generateTokens(staffProfile.user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponse> {
    // Find refresh token
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Generate new tokens
    return this.generateTokens(tokenRecord.user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Delete specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async validateUser(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        tenantId: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const [ownerShops, tenantShops] = await Promise.all([
      this.prisma.shop.findMany({
        where: { ownerId: user.id, isActive: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
      user.tenantId
        ? this.prisma.shop.findMany({
            where: { tenantId: user.tenantId, isActive: true },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const resolvedOwnerShops = ownerShops.length > 0 ? ownerShops : tenantShops;
    const effectiveRole: UserRole = resolvedOwnerShops.length > 0 ? UserRole.OWNER : user.role;

    if (effectiveRole === UserRole.OWNER && user.role !== UserRole.OWNER) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.OWNER },
      });
    }

    const result: {
      id: string;
      email: string;
      name: string;
      phone: string | null;
      role: UserRole;
      tenantId: string | null;
      isEmailVerified: boolean;
      isPhoneVerified: boolean;
      createdAt: Date;
      shopId?: string;
      shopIds?: string[];
      staffProfileId?: string;
      isActive: boolean;
    } = {
      ...user,
      role: effectiveRole,
      phone: user.phone || null,
    };

    if (effectiveRole === UserRole.OWNER) {
      result.shopIds = resolvedOwnerShops.map((shop) => shop.id);
      result.shopId = result.shopIds[0];
    }

    if (effectiveRole === UserRole.STAFF) {
      const profile = await (this.prisma as any).staffProfile.findFirst({
        where: { userId: user.id, isActive: true, isSuspended: false },
        select: { id: true, shopId: true },
        orderBy: { createdAt: 'asc' },
      });

      if (profile) {
        result.staffProfileId = profile.id;
        result.shopId = profile.shopId;
        result.shopIds = [profile.shopId];
      } else {
        const legacyStaff = await this.prisma.staff.findMany({
          where: { userId: user.id, isActive: true },
          select: { id: true, shopId: true },
          orderBy: { createdAt: 'asc' },
        });

        if (legacyStaff.length > 0) {
          result.shopIds = legacyStaff.map((item) => item.shopId);
          result.shopId = result.shopIds[0];
        }
      }
    }

    return result;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If user doesn't have a password (Google-only account), they can't use change-password
    if (!user.hashedPassword) {
      throw new BadRequestException(
        'Cannot change password for Google-only accounts. Set a password first.',
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async generateTokens(user: any): Promise<TokenResponse> {
    let effectiveRole = user.role as UserRole;
    let shopIds: string[] = [];
    let staffProfileId: string | undefined;

    const [ownedShops, tenantShops] = await Promise.all([
      this.prisma.shop.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      }),
      user.tenantId
        ? this.prisma.shop.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const resolvedOwnerShops = ownedShops.length > 0 ? ownedShops : tenantShops;

    if (resolvedOwnerShops.length > 0) {
      effectiveRole = UserRole.OWNER;
      shopIds = resolvedOwnerShops.map((shop) => shop.id);
      if (user.role !== UserRole.OWNER) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: UserRole.OWNER },
        });
      }
    }

    if (effectiveRole === UserRole.OWNER && shopIds.length === 0) {
      const ownerShops = await this.prisma.shop.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      shopIds = ownerShops.map((shop) => shop.id);
    }

    if (effectiveRole === UserRole.STAFF) {
      const profile = await (this.prisma as any).staffProfile.findFirst({
        where: { userId: user.id, isActive: true, isSuspended: false },
        orderBy: { createdAt: 'asc' },
        select: { id: true, shopId: true },
      });
      if (profile) {
        staffProfileId = profile.id;
        shopIds = [profile.shopId];
      } else {
        const legacyStaff = await this.prisma.staff.findMany({
          where: { userId: user.id, isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { shopId: true },
        });
        shopIds = legacyStaff.map((row) => row.shopId);
      }
    }

    const primaryShopId = shopIds[0];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || null,
      role: effectiveRole,
      tenantId: user.tenantId || undefined,
      shopId: primaryShopId,
      shopIds,
      staffProfileId,
    };

    // Generate access token
    let accessToken: string;
    try {
      accessToken = this.jwtService.sign(payload);
    } catch (error: any) {
      this.logger.error(`[JWT_SIGN_ERROR] ${error?.message || 'Unknown JWT signing error'}`);
      throw new InternalServerErrorException('Failed to generate authentication token');
    }

    // Generate refresh token
    const refreshToken = uuidv4();
    const refreshExpiration = this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const expiresAt = this.calculateExpiration(refreshExpiration);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Calculate access token expiration in seconds
    const accessExpiration = this.configService.get<string>('jwt.accessExpiration') || '15m';
    const expiresIn = this.parseExpirationToSeconds(accessExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email || null,
        name: user.name,
        phone: user.phone || null,
        role: effectiveRole,
        avatarUrl: user.avatarUrl || null,
        tenantId: user.tenantId,
        shopId: primaryShopId,
        shopIds,
        staffProfileId,
        isEmailVerified: user.isEmailVerified ?? false,
        isPhoneVerified: user.isPhoneVerified ?? false,
        createdAt: user.createdAt,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { identifier, otp, newPassword } = dto;
    let target = identifier.trim().toLowerCase();
    
    // Check if it's a phone number and normalize
    if (/^\+?\d+$/.test(target)) {
      target = this.normalizePhone(target);
    }

    // Get active OTP for this target, purpose can be LOGIN or PHONE_VERIFY or anything active
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: target,
        isVerified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (record.attempts >= 3) {
      throw new BadRequestException('Maximum OTP attempts exceeded.');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const otpHash = this.hashOtp(otp);
    if (record.otp !== otpHash) {
      throw new BadRequestException('Invalid OTP.');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { isVerified: true },
    });

    // Find user by phone or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: { in: this.phoneVariants(target) } },
          { email: target }
        ]
      }
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.hashedPassword) {
      const isSamePassword = await bcrypt.compare(newPassword, user.hashedPassword);
      if (isSamePassword) {
        throw new BadRequestException('New password cannot be the same as the old password.');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    return { message: 'Password has been successfully reset.' };
  }

  private calculateExpiration(duration: string): Date {
    const seconds = this.parseExpirationToSeconds(duration);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseExpirationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
