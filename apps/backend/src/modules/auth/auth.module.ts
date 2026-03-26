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
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';
import { GoogleModule } from '../google/google.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { OtpModule } from '../otp/otp.module';

const decodeJwtSecret = (rawSecret?: string): Buffer => {
  const secret = rawSecret?.trim();
  if (!secret) {
    throw new Error('MISSING_JWT_SECRET: JWT_SECRET is required and must be Base64 encoded.');
  }

  // Basic Base64 format validation before decoding.
  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Pattern.test(secret)) {
    throw new Error('INVALID_JWT_SECRET_FORMAT: JWT_SECRET must be valid Base64.');
  }

  const decoded = Buffer.from(secret, 'base64');
  if (!decoded || decoded.length < 32) {
    throw new Error(
      'WEAK_JWT_SECRET: decoded JWT_SECRET must be at least 32 bytes (256 bits).',
    );
  }

  return decoded;
};

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: decodeJwtSecret(configService.get<string>('jwt.secret')),
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
  providers: [AuthService, JwtStrategy, GoogleStrategy, JwtAuthGuard, RolesGuard, GoogleOAuthGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
