import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from './events.gateway';
import { resolveJwtSecret } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    // IMPORTANT: Must use the SAME `resolveJwtSecret` as `auth.module.ts`.
    //
    // `WsJwtGuard` is not exported from auth.module, so Nest instantiates
    // it through THIS module's DI container — meaning the guard's
    // `JwtService` comes from the registration below, not from auth.
    // If this used `configService.get('JWT_SECRET')` raw, while auth uses
    // the Base64-decoded Buffer, every HTTP-issued token would fail WS
    // verification with `invalid signature`. That was the production bug.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService.get<string>('JWT_SECRET')),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '1d'),
        },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EventsGateway],
  exports: [NotificationsService, EventsGateway],
})
export class NotificationsModule {}
