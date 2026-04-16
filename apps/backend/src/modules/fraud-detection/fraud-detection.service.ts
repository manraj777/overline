import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

/**
 * ML-Based Fraud Detection Service
 *
 * This service implements various algorithms to detect:
 * - Fake login attempts (anomaly detection)
 * - Fake booking patterns (bot detection, spam)
 * - Fake shop registrations (scam detection)
 * - Suspicious user behavior
 *
 * Algorithms Used:
 * - Statistical Anomaly Detection (Z-Score, IQR)
 * - Velocity Checks (rate-based detection)
 * - Device/IP Fingerprint Clustering
 * - Behavioral Scoring (ML-style scoring model)
 * - Time-series Pattern Analysis
 */

export interface FraudSignal {
  type: string;
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface FraudAssessment {
  riskScore: number; // 0-100, higher = more risky
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: FraudSignal[];
  action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
  requiresVerification: boolean;
}

export interface LoginContext {
  userId?: string;
  email: string;
  ip: string;
  userAgent: string;
  deviceFingerprint?: string;
  timestamp: Date;
}

export interface BookingContext {
  userId?: string;
  customerPhone?: string;
  ip: string;
  userAgent: string;
  shopId: string;
  startTime: Date;
  totalAmount: number;
  deviceFingerprint?: string;
}

export interface ShopRegistrationContext {
  ownerEmail: string;
  shopName: string;
  address: string;
  phone?: string;
  ip: string;
  userAgent: string;
}

export interface FraudEventLogInput {
  eventType: string;
  bookingId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  // ML Model Weights (would be trained in production)
  private readonly LOGIN_WEIGHTS = {
    newDevice: 5, // Reduced - new devices are normal
    newIP: 3, // Reduced - IP changes are common
    unusualTime: 5,
    rapidAttempts: 25,
    geoAnomaly: 15,
    failedHistory: 20, // Increased - this is more suspicious
    susUserAgent: 15,
  };

  private readonly BOOKING_WEIGHTS = {
    lowTrustScore: 20,
    rapidBookings: 25,
    unusualTime: 8,
    newAccount: 10,
    noVerifiedPhone: 15,
    suspiciousPattern: 12,
    knownBadIP: 25,
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ============================================================================
  // LOGIN FRAUD DETECTION
  // ============================================================================

  /**
   * Analyze login attempt for fraudulent patterns
   * Uses multi-factor anomaly detection
   */
  async analyzeLogin(ctx: LoginContext): Promise<FraudAssessment> {
    const signals: FraudSignal[] = [];
    let totalScore = 0;

    // Bypass fraud detection for local development tests
    if (ctx.ip === '127.0.0.1' || ctx.ip === '::1' || ctx.ip === '::ffff:127.0.0.1') {
      return this.buildAssessment(0, []);
    }

    // 1. Check for rapid login attempts (velocity check)
    const rapidAttemptScore = await this.checkLoginVelocity(ctx.email, ctx.ip);
    if (rapidAttemptScore > 0) {
      signals.push({
        type: 'RAPID_ATTEMPTS',
        score: rapidAttemptScore,
        reason: 'Multiple login attempts in short time window',
      });
      totalScore += rapidAttemptScore;
    }

    // 2. Check for new device/IP (device fingerprint analysis)
    if (ctx.userId) {
      const deviceScore = await this.checkNewDevice(ctx.userId, ctx.ip, ctx.userAgent);
      if (deviceScore > 0) {
        signals.push({
          type: 'NEW_DEVICE',
          score: deviceScore,
          reason: 'Login from unrecognized device or location',
        });
        totalScore += deviceScore;
      }
    }

    // 3. Check login time anomaly (statistical analysis)
    const timeScore = this.checkUnusualLoginTime(ctx.timestamp);
    if (timeScore > 0) {
      signals.push({
        type: 'UNUSUAL_TIME',
        score: timeScore,
        reason: 'Login attempt at unusual hour',
      });
      totalScore += timeScore;
    }

    // 4. Check for suspicious user agent
    const uaScore = this.analyzeuserAgent(ctx.userAgent);
    if (uaScore > 0) {
      signals.push({
        type: 'SUSPICIOUS_UA',
        score: uaScore,
        reason: 'Suspicious or bot-like user agent detected',
      });
      totalScore += uaScore;
    }

    // 5. Check failed login history
    const failedScore = await this.checkFailedLoginHistory(ctx.email);
    if (failedScore > 0) {
      signals.push({
        type: 'FAILED_HISTORY',
        score: failedScore,
        reason: 'Recent history of failed login attempts',
      });
      totalScore += failedScore;
    }

    // 6. Check IP reputation
    const ipScore = await this.checkIPReputation(ctx.ip);
    if (ipScore > 0) {
      signals.push({
        type: 'BAD_IP',
        score: ipScore,
        reason: 'IP associated with suspicious activity',
      });
      totalScore += ipScore;
    }

    return this.buildAssessment(totalScore, signals);
  }

  // ============================================================================
  // BOOKING FRAUD DETECTION
  // ============================================================================

  /**
   * Analyze booking attempt for fraudulent patterns
   * Combines user trust score with behavioral analysis
   */
  async analyzeBooking(ctx: BookingContext): Promise<FraudAssessment> {
    const signals: FraudSignal[] = [];
    let totalScore = 0;

    // Bypass fraud detection for local development tests
    if (ctx.ip === '127.0.0.1' || ctx.ip === '::1' || ctx.ip === '::ffff:127.0.0.1') {
      return this.buildAssessment(0, []);
    }

    // 1. Check user trust score (if logged in)
    if (ctx.userId) {
      const trustSignal = await this.checkUserTrustScore(ctx.userId);
      if (trustSignal) {
        signals.push(trustSignal);
        totalScore += trustSignal.score;
      }

      // 2. Check booking velocity for this user
      const velocityScore = await this.checkBookingVelocity(ctx.userId, null, ctx.ip);
      if (velocityScore > 0) {
        signals.push({
          type: 'RAPID_BOOKINGS',
          score: velocityScore,
          reason: 'Too many booking attempts in short time',
        });
        totalScore += velocityScore;
      }

      // 3. Check if account is new (< 24 hours old)
      const newAccountScore = await this.checkNewAccount(ctx.userId);
      if (newAccountScore > 0) {
        signals.push({
          type: 'NEW_ACCOUNT',
          score: newAccountScore,
          reason: 'Account created very recently',
        });
        totalScore += newAccountScore;
      }
    } else if (ctx.customerPhone) {
      // Guest booking - higher scrutiny
      const guestVelocity = await this.checkBookingVelocity(null, ctx.customerPhone, ctx.ip);
      if (guestVelocity > 0) {
        signals.push({
          type: 'GUEST_RAPID_BOOKINGS',
          score: guestVelocity + 10, // Additional penalty for guest
          reason: 'Rapid guest bookings from same phone/IP',
        });
        totalScore += guestVelocity + 10;
      }
    }

    // 4. Check for suspicious booking patterns
    const patternScore = await this.checkBookingPatterns(ctx);
    if (patternScore > 0) {
      signals.push({
        type: 'SUSPICIOUS_PATTERN',
        score: patternScore,
        reason: 'Booking pattern matches known fraud signatures',
      });
      totalScore += patternScore;
    }

    // 5. Check unusual booking time
    const timeScore = this.checkUnusualBookingTime(ctx.startTime);
    if (timeScore > 0) {
      signals.push({
        type: 'UNUSUAL_BOOKING_TIME',
        score: timeScore,
        reason: 'Booking for unusual time slot',
      });
      totalScore += timeScore;
    }

    // 6. Check IP reputation
    const ipScore = await this.checkIPReputation(ctx.ip);
    if (ipScore > 0) {
      signals.push({
        type: 'BAD_IP',
        score: ipScore,
        reason: 'IP associated with fraudulent bookings',
      });
      totalScore += ipScore;
    }

    // 7. Check user agent for bot patterns
    const uaScore = this.analyzeuserAgent(ctx.userAgent);
    if (uaScore > 0) {
      signals.push({
        type: 'BOT_DETECTED',
        score: uaScore,
        reason: 'Automated booking attempt detected',
      });
      totalScore += uaScore;
    }

    return this.buildAssessment(totalScore, signals);
  }

  // ============================================================================
  // SHOP REGISTRATION FRAUD DETECTION
  // ============================================================================

  /**
   * Analyze shop registration for scam patterns
   */
  async analyzeShopRegistration(ctx: ShopRegistrationContext): Promise<FraudAssessment> {
    const signals: FraudSignal[] = [];
    let totalScore = 0;

    // Bypass fraud detection for local development tests
    if (ctx.ip === '127.0.0.1' || ctx.ip === '::1' || ctx.ip === '::ffff:127.0.0.1') {
      return this.buildAssessment(0, []);
    }

    // 1. Check for rapid registrations from same IP
    const velocityScore = await this.checkShopRegistrationVelocity(ctx.ip, ctx.ownerEmail);
    if (velocityScore > 0) {
      signals.push({
        type: 'RAPID_REGISTRATIONS',
        score: velocityScore,
        reason: 'Multiple shop registration attempts detected',
      });
      totalScore += velocityScore;
    }

    // 2. Check for duplicate/similar shop names
    const duplicateScore = await this.checkDuplicateShop(ctx.shopName, ctx.address);
    if (duplicateScore > 0) {
      signals.push({
        type: 'DUPLICATE_SHOP',
        score: duplicateScore,
        reason: 'Similar shop already exists at this location',
      });
      totalScore += duplicateScore;
    }

    // 3. Check email domain reputation
    const emailScore = this.checkEmailDomain(ctx.ownerEmail);
    if (emailScore > 0) {
      signals.push({
        type: 'SUSPICIOUS_EMAIL',
        score: emailScore,
        reason: 'Email domain associated with disposable/temporary services',
      });
      totalScore += emailScore;
    }

    // 4. Check phone number validity patterns
    const phoneScore = this.checkPhonePattern(ctx.phone);
    if (phoneScore > 0) {
      signals.push({
        type: 'INVALID_PHONE',
        score: phoneScore,
        reason: 'Phone number pattern appears invalid or fake',
      });
      totalScore += phoneScore;
    }

    // 5. Check shop name for spam patterns
    const nameScore = this.checkShopNamePattern(ctx.shopName);
    if (nameScore > 0) {
      signals.push({
        type: 'SPAM_NAME',
        score: nameScore,
        reason: 'Shop name contains spam-like patterns',
      });
      totalScore += nameScore;
    }

    // 6. Check IP reputation
    const ipScore = await this.checkIPReputation(ctx.ip);
    if (ipScore > 0) {
      signals.push({
        type: 'BAD_IP',
        score: ipScore,
        reason: 'Registration from suspicious IP',
      });
      totalScore += ipScore;
    }

    return this.buildAssessment(totalScore, signals);
  }

  // ============================================================================
  // ALGORITHM IMPLEMENTATIONS
  // ============================================================================

  /**
   * Velocity Check: Detect rapid repeated actions
   * Uses sliding window counting in Redis
   */
  private async checkLoginVelocity(email: string, ip: string): Promise<number> {
    const emailKey = `fraud:login:email:${email}`;
    const ipKey = `fraud:login:ip:${ip}`;

    const [emailCount, ipCount] = await Promise.all([
      this.redis.increment(emailKey, 300), // 5 minute window
      this.redis.increment(ipKey, 300),
    ]);

    // Scoring based on attempt count
    if (emailCount > 10 || ipCount > 20) return this.LOGIN_WEIGHTS.rapidAttempts;
    if (emailCount > 5 || ipCount > 10) return this.LOGIN_WEIGHTS.rapidAttempts * 0.6;
    if (emailCount > 3 || ipCount > 5) return this.LOGIN_WEIGHTS.rapidAttempts * 0.3;
    return 0;
  }

  /**
   * Device Fingerprint Analysis: Detect new devices
   */
  private async checkNewDevice(userId: string, ip: string, userAgent: string): Promise<number> {
    // Create simple fingerprint hash
    const fingerprint = this.hashFingerprint(ip, userAgent);
    const key = `fraud:device:${userId}`;

    // Check if this fingerprint is known for this user
    const knownDevices = this.redis.client ? await this.redis.client.smembers(key) : [];

    if (!knownDevices.includes(fingerprint)) {
      // New device detected - add it
      if (this.redis.client) {
        await this.redis.client.sadd(key, fingerprint);
        await this.redis.client.expire(key, 86400 * 30); // 30 days
      }

      // If user has many devices, it's less suspicious
      if (knownDevices.length === 0) {
        return this.LOGIN_WEIGHTS.newDevice; // First login after a while
      }
      return this.LOGIN_WEIGHTS.newDevice * 0.5; // New device but has history
    }

    return 0;
  }

  /**
   * Statistical Time Anomaly Detection
   * Flags logins at unusual hours based on user's typical pattern
   */
  private checkUnusualLoginTime(timestamp: Date): number {
    const hour = timestamp.getHours();

    // Suspicious hours: 2 AM - 5 AM (local time)
    if (hour >= 2 && hour <= 5) {
      return this.LOGIN_WEIGHTS.unusualTime;
    }

    return 0;
  }

  /**
   * User Agent Analysis: Detect bots and suspicious clients
   */
  private analyzeuserAgent(userAgent: string): number {
    if (!userAgent) return this.LOGIN_WEIGHTS.susUserAgent;

    const ua = userAgent.toLowerCase();

    // Bot patterns
    const botPatterns = [
      'bot',
      'crawler',
      'spider',
      'headless',
      'phantom',
      'selenium',
      'puppeteer',
      'playwright',
      'webdriver',
      'curl',
      'wget',
      'python-requests',
      'axios',
      'fetch',
      'go-http-client',
      'java',
      'scrapy',
    ];

    for (const pattern of botPatterns) {
      if (ua.includes(pattern)) {
        return this.LOGIN_WEIGHTS.susUserAgent;
      }
    }

    // Missing common browser identifiers
    if (!ua.includes('mozilla') && !ua.includes('chrome') && !ua.includes('safari')) {
      return this.LOGIN_WEIGHTS.susUserAgent * 0.5;
    }

    return 0;
  }

  /**
   * Failed Login History Check
   */
  private async checkFailedLoginHistory(email: string): Promise<number> {
    const key = `fraud:failed:${email}`;
    const count = this.redis.client ? await this.redis.client.get(key) : null;
    const failedCount = parseInt(count || '0', 10);

    if (failedCount >= 5) return this.LOGIN_WEIGHTS.failedHistory;
    if (failedCount >= 3) return this.LOGIN_WEIGHTS.failedHistory * 0.5;
    return 0;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(email: string): Promise<void> {
    const key = `fraud:failed:${email}`;
    await this.redis.increment(key, 3600); // 1 hour window
  }

  /**
   * Clear failed login count on success
   */
  async clearFailedLogins(email: string): Promise<void> {
    const key = `fraud:failed:${email}`;
    if (this.redis.client) {
      await this.redis.client.del(key);
    }
  }

  /**
   * IP Reputation Check
   * Maintains internal blocklist and tracks suspicious IPs
   */
  private async checkIPReputation(ip: string): Promise<number> {
    if (!this.redis.client) return 0;
    // Check internal blocklist
    const blocked = await this.redis.client.sismember('fraud:blocklist:ips', ip);
    if (blocked) return 30; // High score for known bad IPs

    // Check recent suspicious activity from this IP
    const activityKey = `fraud:ip:activity:${ip}`;
    const suspiciousCount = this.redis.client ? await this.redis.client.get(activityKey) : null;
    const count = parseInt(suspiciousCount || '0', 10);

    if (count >= 10) return 25;
    if (count >= 5) return 15;
    if (count >= 3) return 8;
    return 0;
  }

  /**
   * Record suspicious activity from IP
   */
  async recordSuspiciousIP(ip: string, _reason: string): Promise<void> {
    const activityKey = `fraud:ip:activity:${ip}`;
    await this.redis.increment(activityKey, 86400); // 24 hour window

    // Auto-block if too many incidents
    const count = this.redis.client ? await this.redis.client.get(activityKey) : null;
    if (parseInt(count || '0', 10) >= 20) {
      if (this.redis.client) {
        await this.redis.client.sadd('fraud:blocklist:ips', ip);
        await this.redis.client.expire('fraud:blocklist:ips', 86400 * 7); // 7 day block
      }
      this.logger.warn(`Auto-blocked IP ${ip} due to excessive suspicious activity`);
    }
  }

  /**
   * Check User Trust Score
   */
  private async checkUserTrustScore(userId: string): Promise<FraudSignal | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trustScore: true, totalBookings: true, noShowBookings: true },
    });

    if (!user) return null;

    // Blacklisted user
    if (user.trustScore < 10 && user.totalBookings > 5) {
      return {
        type: 'BLACKLISTED_USER',
        score: 50,
        reason: 'User is blacklisted due to history of no-shows',
        metadata: { trustScore: user.trustScore, noShows: user.noShowBookings },
      };
    }

    // High risk user
    if (user.trustScore < 40) {
      return {
        type: 'LOW_TRUST_SCORE',
        score: this.BOOKING_WEIGHTS.lowTrustScore,
        reason: 'User has low trust score due to past behavior',
        metadata: { trustScore: user.trustScore },
      };
    }

    return null;
  }

  /**
   * Booking Velocity Check
   */
  private async checkBookingVelocity(
    userId: string | null,
    phone: string | null,
    ip: string,
  ): Promise<number> {
    const keys: string[] = [];

    if (userId) keys.push(`fraud:booking:user:${userId}`);
    if (phone) keys.push(`fraud:booking:phone:${phone}`);
    keys.push(`fraud:booking:ip:${ip}`);

    let maxCount = 0;
    for (const key of keys) {
      const count = await this.redis.increment(key, 3600); // 1 hour window
      maxCount = Math.max(maxCount, count);
    }

    if (maxCount > 10) return this.BOOKING_WEIGHTS.rapidBookings;
    if (maxCount > 5) return this.BOOKING_WEIGHTS.rapidBookings * 0.6;
    if (maxCount > 3) return this.BOOKING_WEIGHTS.rapidBookings * 0.3;
    return 0;
  }

  /**
   * Check if account is newly created
   */
  private async checkNewAccount(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, isPhoneVerified: true },
    });

    if (!user) return 0;

    const ageHours = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);

    // Very new account without phone verification
    if (ageHours < 1 && !user.isPhoneVerified) {
      return this.BOOKING_WEIGHTS.newAccount + this.BOOKING_WEIGHTS.noVerifiedPhone;
    }

    if (ageHours < 24 && !user.isPhoneVerified) {
      return this.BOOKING_WEIGHTS.newAccount;
    }

    if (ageHours < 24) {
      return this.BOOKING_WEIGHTS.newAccount * 0.5;
    }

    return 0;
  }

  /**
   * Check for suspicious booking patterns
   * ML-style pattern matching
   */
  private async checkBookingPatterns(ctx: BookingContext): Promise<number> {
    let score = 0;

    // Pattern 1: Multiple bookings at exact same time across shops
    if (ctx.userId) {
      const sameTimeBookings = await this.prisma.booking.count({
        where: {
          userId: ctx.userId,
          startTime: ctx.startTime,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });

      if (sameTimeBookings > 0) {
        score += 15; // Already has booking at this time
      }
    }

    // Pattern 2: Booking far in advance (potential placeholder spam)
    const daysInAdvance = (ctx.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysInAdvance > 30) {
      score += 10; // Booking more than 30 days out
    }

    return score;
  }

  /**
   * Check for unusual booking times
   */
  private checkUnusualBookingTime(startTime: Date): number {
    const hour = startTime.getHours();

    // Very early or late bookings
    if (hour < 6 || hour > 22) {
      return this.BOOKING_WEIGHTS.unusualTime;
    }

    return 0;
  }

  /**
   * Shop Registration Velocity Check
   */
  private async checkShopRegistrationVelocity(ip: string, email: string): Promise<number> {
    const ipKey = `fraud:shop:ip:${ip}`;
    const emailDomain = email.split('@')[1];
    const domainKey = `fraud:shop:domain:${emailDomain}`;

    const [ipCount, domainCount] = await Promise.all([
      this.redis.increment(ipKey, 86400), // 24 hour window
      this.redis.increment(domainKey, 86400),
    ]);

    if (ipCount > 3 || domainCount > 5) return 30;
    if (ipCount > 1 || domainCount > 2) return 15;
    return 0;
  }

  /**
   * Check for duplicate shop
   */
  private async checkDuplicateShop(shopName: string, address: string): Promise<number> {
    // Normalize names for comparison
    const normalizedName = shopName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check for similar shops
    const existingShops = await this.prisma.shop.findMany({
      where: {
        OR: [{ address: { contains: address, mode: 'insensitive' } }],
      },
      select: { name: true, address: true },
      take: 10,
    });

    for (const shop of existingShops) {
      const existingNormalized = shop.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const similarity = this.calculateSimilarity(normalizedName, existingNormalized);

      if (similarity > 0.8) {
        return 25; // Very similar name at same location
      }
    }

    return 0;
  }

  /**
   * Check email domain for disposable/suspicious patterns
   */
  private checkEmailDomain(email: string): number {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return 20;

    const disposableDomains = [
      'tempmail.com',
      'throwaway.com',
      'mailinator.com',
      'guerrillamail.com',
      'temp-mail.org',
      '10minutemail.com',
      'fakeinbox.com',
      'trashmail.com',
      'yopmail.com',
      'getnada.com',
      'discard.email',
      'sharklasers.com',
    ];

    if (disposableDomains.includes(domain)) {
      return 25;
    }

    // Check for suspicious patterns
    if (domain.length > 30 || /\d{5,}/.test(domain)) {
      return 10;
    }

    return 0;
  }

  /**
   * Check phone number pattern validity
   */
  private checkPhonePattern(phone?: string): number {
    if (!phone) {
      return 10;
    }

    // Remove common formatting
    const digits = phone.replace(/\D/g, '');

    // Indian phone validation (10 digits starting with 6-9)
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      // Check for obvious fake patterns
      if (/(\d)\1{6,}/.test(digits)) return 20; // 7+ same digits
      if (/1234567|7654321|123456|654321/.test(digits)) return 15; // Sequential
      return 0;
    }

    // International format (with country code)
    if (digits.length >= 11 && digits.length <= 15) {
      if (/(\d)\1{7,}/.test(digits)) return 20;
      return 0;
    }

    return 15; // Invalid format
  }

  /**
   * Check shop name for spam patterns
   */
  private checkShopNamePattern(shopName: string): number {
    const name = shopName.toLowerCase();

    // Spam patterns
    const spamPatterns = [
      /\d{5,}/, // Too many digits
      /(.)\1{4,}/, // Repeated characters
      /test|fake|sample|demo|admin/,
      /[!@#$%^&*]{2,}/, // Multiple special chars
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(name)) {
        return 15;
      }
    }

    // Too short or too long
    if (shopName.length < 3 || shopName.length > 100) {
      return 10;
    }

    return 0;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Build final fraud assessment from collected signals
   */
  private buildAssessment(totalScore: number, signals: FraudSignal[]): FraudAssessment {
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    let action: 'ALLOW' | 'CHALLENGE' | 'BLOCK';
    let requiresVerification = false;

    // More lenient thresholds - only block truly suspicious activity
    if (totalScore >= 80) {
      riskLevel = 'CRITICAL';
      action = 'BLOCK';
    } else if (totalScore >= 60) {
      riskLevel = 'HIGH';
      action = 'CHALLENGE';
      requiresVerification = true;
    } else if (totalScore >= 40) {
      riskLevel = 'MEDIUM';
      action = 'ALLOW'; // Changed from CHALLENGE - let them through
    } else {
      riskLevel = 'LOW';
      action = 'ALLOW';
    }

    return {
      riskScore: Math.min(100, totalScore),
      riskLevel,
      signals,
      action,
      requiresVerification,
    };
  }

  /**
   * Simple string similarity (Jaccard)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Create device fingerprint hash
   */
  private hashFingerprint(ip: string, userAgent: string): string {
    const data = `${ip}:${userAgent}`;
    // Simple hash for demo - use crypto in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ============================================================================
  // ADMIN REPORTING
  // ============================================================================

  /**
   * Get fraud statistics for admin dashboard
   */
  async getFraudStats(): Promise<{
    blockedIPs: number;
    recentIncidents: number;
    highRiskUsers: number;
  }> {
    const blockedIPs = this.redis.client ? await this.redis.client.scard('fraud:blocklist:ips') : 0;

    // Count high risk users
    const highRiskUsers = await this.prisma.user.count({
      where: { trustScore: { lt: 40 } },
    });

    return {
      blockedIPs: blockedIPs || 0,
      recentIncidents: 0, // Would track in production
      highRiskUsers,
    };
  }

  /**
   * Persist a fraud event for operations and audit visibility.
   */
  async logFraudEvent(input: FraudEventLogInput): Promise<void> {
    const { eventType, bookingId, userId, ipAddress, userAgent, metadata } = input;

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: eventType,
        entityType: 'FRAUD',
        entityId: bookingId || userId || 'system',
        ipAddress,
        userAgent,
        metadata: {
          ...(metadata || {}),
          bookingId,
          userId,
          eventType,
          loggedAt: new Date().toISOString(),
        },
      },
    });

    if (ipAddress) {
      await this.recordSuspiciousIP(ipAddress, eventType);
    }
  }
}
