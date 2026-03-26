import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService, TokenResponse } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterShopDto } from './dto/register-shop.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Extract request context for fraud detection
   */
  private getRequestContext(req: any) {
    return {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
  }

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async signup(@Body() dto: SignupDto, @Req() req: any): Promise<TokenResponse> {
    return this.authService.signup(dto, this.getRequestContext(req));
  }

  @Post('register-shop')
  @ApiOperation({ summary: 'Register a new shop owner and provision their shop' })
  @ApiResponse({ status: 201, description: 'Shop and owner registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async registerShop(@Body() dto: RegisterShopDto, @Req() req: any): Promise<TokenResponse> {
    return this.authService.registerShop(dto, this.getRequestContext(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: any): Promise<TokenResponse> {
    return this.authService.login(dto, this.getRequestContext(req));
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or signup with Google (ID token)' })
  @ApiResponse({ status: 200, description: 'Google login successful' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleLogin(@Body() dto: GoogleLoginDto): Promise<TokenResponse> {
    return this.authService.googleLogin(dto);
  }

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google for OAuth login' })
  async googleRedirect(@Query('from') _from?: string): Promise<void> {
    return;
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google for OAuth login (preferred endpoint)' })
  async googleAuth(@Query('from') _from?: string): Promise<void> {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: any,
    @Res() res: Response,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const normalizedState = state === 'admin' ? 'admin' : 'user';
    const isAdmin = normalizedState === 'admin';
    const frontendUrl = isAdmin
      ? this.configService.get<string>('frontendUrls.admin') || 'http://localhost:3002'
      : this.configService.get<string>('frontendUrls.user') || 'http://localhost:3000';
    const loginPath = isAdmin ? '/login' : '/auth/login';

    if (error || !req.user) {
      return res.redirect(`${frontendUrl}${loginPath}?error=google_auth_failed`);
    }

    try {
      const tokens = await this.authService.handleGoogleUser(
        req.user.googleId,
        req.user.email,
        req.user.name,
        req.user.picture,
        req.user.emailVerified,
      );

      const redirectParams = new URLSearchParams({
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: String(tokens.expiresIn),
        user: JSON.stringify(tokens.user),
      });

      if (isAdmin && !tokens.user.shopId) {
        redirectParams.set('needsShopSetup', 'true');
      }

      const callbackPath = isAdmin ? '/auth/google/callback' : '/auth/callback';
      return res.redirect(`${frontendUrl}${callbackPath}?${redirectParams.toString()}`);
    } catch (err: any) {
      console.error('[GoogleCallback] Error:', err.message);
      console.error('[GoogleCallback] Stack:', err.stack);
      console.error('[GoogleCallback] Full error:', JSON.stringify(err, null, 2));
      return res.redirect(`${frontendUrl}${loginPath}?error=google_auth_failed`);
    }
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone for login/signup' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendPhoneOtp(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone OTP and login/signup user' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<TokenResponse> {
    return this.authService.verifyPhoneOtp(dto.phone, dto.otp);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout and invalidate refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: any,
    @Body() body: { refreshToken?: string },
  ): Promise<{ message: string }> {
    await this.authService.logout(req.user.id, body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }
}
