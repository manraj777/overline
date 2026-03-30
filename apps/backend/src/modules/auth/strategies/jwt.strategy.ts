import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

const decodeJwtSecret = (rawSecret?: string): Buffer => {
  const secret = rawSecret?.trim();
  if (!secret) {
    throw new Error('MISSING_JWT_SECRET: JWT_SECRET is required and must be Base64 encoded.');
  }

  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Pattern.test(secret)) {
    throw new Error('INVALID_JWT_SECRET_FORMAT: JWT_SECRET must be valid Base64.');
  }

  const decoded = Buffer.from(secret, 'base64');
  if (!decoded || decoded.length < 32) {
    throw new Error('WEAK_JWT_SECRET: decoded JWT_SECRET must be at least 32 bytes (256 bits).');
  }

  return decoded;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: decodeJwtSecret(configService.get<string>('jwt.secret')),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
