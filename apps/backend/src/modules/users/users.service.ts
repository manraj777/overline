import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const TEMP_OTP_CODE = '123456';

@Injectable()
export class UsersService {
  private twilioClient: Twilio.Twilio | null = null;
  private twilioPhone: string | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken) {
      this.twilioClient = Twilio(accountSid, authToken);
    }
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        tenantId: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          phone: dto.phone,
          avatarUrl: dto.avatarUrl,
          email: dto.email,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
        throw new BadRequestException(
          'This phone number is already registered to another account.',
        );
      }
      throw error;
    }
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  async sendOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.phone) {
      throw new BadRequestException('User does not have a phone number set');
    }

    const otpCode = TEMP_OTP_CODE;
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { otpCode, otpExpiresAt },
    } as any);

    // Temporary OTP bypass mode: do not send SMS.

    console.log(
      `\n\n=== [OTP SIMULATION BASE] ===\nGenerated OTP ${otpCode} for ${user.phone}\n=============================\n\n`,
    );

    return { success: true, message: 'OTP sent successfully' };
  }

  async verifyOtp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isPhoneVerified) {
      return { success: true, message: 'Phone already verified' };
    }

    if (!(user as any).otpCode || !(user as any).otpExpiresAt) {
      throw new BadRequestException('No OTP was requested');
    }

    if (new Date() > (user as any).otpExpiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    if (code !== TEMP_OTP_CODE) {
      throw new BadRequestException('Invalid OTP code');
    }

    await (this.prisma.user as any).update({
      where: { id: userId },
      data: {
        isPhoneVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    } as any);

    return { success: true, message: 'Phone verified successfully' };
  }

  async updateFcmToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
    return { success: true };
  }
}
