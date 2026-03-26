import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { Twilio } from 'twilio';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  FraudDetectionService,
  LoginContext,
  ShopRegistrationContext,
} from '../fraud-detection/fraud-detection.service';
import { GooglePlacesService } from '../google/google-places.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterShopDto } from './dto/register-shop.dto';
import { UserRole, DayOfWeek } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: UserRole;
    tenantId?: string;
    shopId?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    createdAt?: Date;
  };
}

export interface RequestContext {
  ip: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;
  private twilioClient: Twilio | null = null;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
    private fraudDetection: FraudDetectionService,
    private googlePlaces: GooglePlacesService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('google.clientId'));

    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (twilioSid && twilioAuthToken) {
      this.twilioClient = new Twilio(twilioSid, twilioAuthToken);
    }
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

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpSms(phone: string, otp: string): Promise<void> {
    const fromPhone =
      this.configService.get<string>('TWILIO_PHONE') ||
      this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.twilioClient || !fromPhone) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP] ${phone}: ${otp}`);
      }
      return;
    }

    await this.twilioClient.messages.create({
      body: `Your Overline OTP is ${otp}. It expires in 5 minutes.`,
      from: fromPhone,
      to: phone,
    });
  }

  async sendPhoneOtp(
    phone: string,
  ): Promise<{ message: string; expiresInSeconds: number; retryAfterSeconds?: number }> {
    const normalizedPhone = this.normalizePhone(phone);
    const rateLimitKey = `otp:rate:${normalizedPhone}`;
    const otpRequestCount = await this.redis.increment(rateLimitKey, 3600);

    if (otpRequestCount > 3) {
      const ttl = await this.redis.ttl(rateLimitKey);
      throw new BadRequestException(
        `Too many OTP requests. Try again in ${Math.max(ttl, 1)} seconds.`,
      );
    }

    const otp = this.generateOtpCode();

    await this.redis.set(`otp:${normalizedPhone}`, otp, 300);
    await this.sendOtpSms(normalizedPhone, otp);

    return {
      message: 'OTP sent successfully',
      expiresInSeconds: 300,
      retryAfterSeconds: 60,
    };
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<TokenResponse> {
    const normalizedPhone = this.normalizePhone(phone);
    const key = `otp:${normalizedPhone}`;
    const cachedOtp = await this.redis.get(key);

    if (!cachedOtp) {
      throw new BadRequestException('OTP expired. Please request a new OTP.');
    }

    if (cachedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.del(key);

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        return tx.user.update({
          where: { id: existingUser.id },
          data: {
            isPhoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      }

      const emailPrefix = normalizedPhone.replace(/\D/g, '');
      const generatedEmail = `${emailPrefix}.${Date.now()}@phone.overline.app`;
      return tx.user.create({
        data: {
          phone: normalizedPhone,
          isPhoneVerified: true,
          name: `User ${normalizedPhone.slice(-4)}`,
          email: generatedEmail,
          role: UserRole.USER,
          authProvider: 'phone',
          lastLoginAt: new Date(),
        },
      });
    });

    return this.generateTokens(user);
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
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        hashedPassword,
        role: UserRole.USER,
      },
    });

    // Generate OTP if phone is provided
    if (user.phone) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user = await (this.prisma.user as any).update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt },
      } as any);
      console.log(
        `\n\n=== [OTP SIMULATION] ===\nSent OTP ${otpCode} to ${user.phone}\n========================\n\n`,
      );
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  async registerShop(
    dto: RegisterShopDto,
    requestContext?: RequestContext,
  ): Promise<TokenResponse> {
    // --- FRAUD DETECTION FOR SHOP REGISTRATION ---
    if (requestContext) {
      const fraudContext: ShopRegistrationContext = {
        ownerEmail: dto.email,
        shopName: dto.shopName,
        address: dto.address,
        phone: dto.phone,
        ip: requestContext.ip,
        userAgent: requestContext.userAgent,
      };
      const assessment = await this.fraudDetection.analyzeShopRegistration(fraudContext);

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

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const saltRounds = this.configService.get<number>('bcrypt.saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const slug =
      dto.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      Math.floor(1000 + Math.random() + 9000);

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
    }

    // Create Tenant, Shop, Owner, QueueStats, and WorkingHours in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.shopName + ' Tenant',
          type: dto.shopType,
        },
      });

      // 2. Create Shop Owner (User)
      const owner = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.ownerName,
          phone: dto.phone,
          hashedPassword,
          role: UserRole.OWNER,
          tenantId: tenant.id,
        },
      });

      // 3. Create Shop
      const shop = await tx.shop.create({
        data: {
          tenantId: tenant.id,
          name: dto.shopName,
          slug,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          phone: dto.phone,
          email: dto.email,
          latitude: googleVerification.verifiedLocation?.lat || dto.latitude,
          longitude: googleVerification.verifiedLocation?.lng || dto.longitude,
          autoAcceptBookings: true,
          maxConcurrentBookings: 1,
          // Google Verification fields
          isGoogleVerified: googleVerification.isVerified,
          googlePlaceId: googleVerification.placeId,
          googleRating: googleVerification.rating,
          googleReviewsCount: googleVerification.reviewsCount || 0,
          verificationStatus: googleVerification.isVerified ? 'GOOGLE_VERIFIED' : 'PENDING',
          verifiedAt: googleVerification.isVerified ? new Date() : null,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
      throw new UnauthorizedException(`Invalid Google token: ${error?.message || 'Verification failed'}`);
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;
    return this.handleGoogleUser(googleId, email, name, picture, email_verified);
  }

  async handleGoogleUser(
    googleId: string,
    email: string,
    name?: string,
    picture?: string,
    emailVerified?: boolean,
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
            role: UserRole.USER,
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
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
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
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
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

    const ownerPrimaryShop =
      user.role === UserRole.OWNER
        ? await this.prisma.shop.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          })
        : null;

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        role: user.role,
        tenantId: user.tenantId,
        shopId: ownerPrimaryShop?.id,
        isEmailVerified: user.isEmailVerified ?? false,
        isPhoneVerified: user.isPhoneVerified ?? false,
        createdAt: user.createdAt,
      },
    };
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
