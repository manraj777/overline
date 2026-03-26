import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const backendUrl = configService.get<string>('backendUrl') || 'http://localhost:3001';
    const clientID = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    const callbackURL =
      configService.get<string>('google.callbackUrl') ||
      `${backendUrl}/api/v1/auth/google/callback`;

    console.log('[GoogleStrategy] clientID:', clientID?.substring(0, 20) + '...');
    console.log(
      '[GoogleStrategy] clientSecret set:',
      !!clientSecret,
      'length:',
      clientSecret?.length,
    );
    console.log('[GoogleStrategy] callbackURL:', callbackURL);

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      googleId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`.trim(),
      picture: photos?.[0]?.value,
      emailVerified: emails[0].verified ?? true,
    };

    done(null, user);
  }
}
