import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OtpService } from '../otp/otp.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getNotifications(userId, page, limit);
  }

  @Patch('me/notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.usersService.markNotificationRead(userId, notificationId);
  }

  @Post('me/otp/send')
  @ApiOperation({ summary: 'Send phone verification OTP to current user' })
  async sendOtp(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.phone) {
      throw new BadRequestException('No phone number associated with this account. Please add a phone number first.');
    }
    return this.otpService.sendPhoneVerificationOtp({
      userId,
      phone: user.phone,
    });
  }

  @Post('me/otp/verify')
  @ApiOperation({ summary: 'Verify phone OTP for current user' })
  async verifyOtp(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    if (!code || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('OTP must be a 6-digit code.');
    }
    const user = await this.usersService.findById(userId);
    if (!user?.phone) {
      throw new BadRequestException('No phone number associated with this account.');
    }
    // verifyPhoneOtpForUser marks phone as verified and returns new tokens
    const tokenResponse = await this.otpService.verifyPhoneOtpForUser(userId, user.phone, code);
    return {
      success: true,
      message: 'Phone verified successfully',
      ...tokenResponse,
    };
  }

  @Post('fcm-token')
  @ApiOperation({ summary: 'Update push notification token for user' })
  async updateFcmToken(@CurrentUser('id') userId: string, @Body('token') token: string) {
    return this.usersService.updateFcmToken(userId, token);
  }
}
