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

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
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
