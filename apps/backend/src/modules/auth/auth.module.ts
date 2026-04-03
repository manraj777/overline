import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ShopOwnerGuard } from './guards/shop-owner.guard';
import { StaffGuard } from './guards/staff.guard';
import { ShopMemberGuard } from './guards/shop-member.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';
import { GoogleModule } from '../google/google.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { OtpModule } from '../otp/otp.module';

/**
 * Resolve JWT secret — accepts both raw strings and Base64-encoded values.
 * If the value is valid Base64 and decodes to ≥ 32 bytes, use the decoded buffer.
 * Otherwise treat the raw string as the secret (must be ≥ 32 chars).
 */
const resolveJwtSecret = (rawSecret?: string): string | Buffer => {
  const secret = rawSecret?.trim();
  if (!secret) {
    throw new Error('MISSING_JWT_SECRET: JWT_SECRET environment variable is required.');
  }

  // Try Base64 first
  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (base64Pattern.test(secret) && secret.length > 40) {
    const decoded = Buffer.from(secret, 'base64');
    if (decoded.length >= 32) {
      return decoded;
    }
  }

  // Fall back to raw string — must be at least 32 chars for security
  if (secret.length < 32) {
    throw new Error('WEAK_JWT_SECRET: JWT_SECRET must be at least 32 characters.');
  }

  return secret;
};

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService.get<string>('jwt.secret')),
        signOptions: {
          expiresIn: configService.get('jwt.accessExpiration'),
        },
      }),
    }),
    FraudDetectionModule,
    GoogleModule,
    forwardRef(() => OtpModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    RolesGuard,
    ShopOwnerGuard,
    StaffGuard,
    ShopMemberGuard,
    GoogleOAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, ShopOwnerGuard, StaffGuard, ShopMemberGuard],
})
export class AuthModule {}
