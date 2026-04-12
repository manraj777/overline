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
      clientID: clientID || '',
      clientSecret: clientSecret || '',
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
      proxy: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      if (!accessToken) {
        console.error('[GoogleStrategy] Missing access token');
        return done(null, false, { message: 'Missing Google access token' });
      }

      if (!profile) {
        console.error('[GoogleStrategy] Missing Google profile object');
        return done(null, false, { message: 'Missing Google profile object' });
      }

      const state = req?.query?.state;
      const normalizedState = state === 'admin' ? 'admin' : 'user';
      const { id, name, emails, photos } = profile;
      const primaryEmail = Array.isArray(emails) ? emails[0]?.value : undefined;

      console.log('[OAuth Step 2] profile received', {
        state: normalizedState,
        googleIdPresent: !!id,
        emailPresent: !!primaryEmail,
        provider: profile?.provider,
      });

      if (!id || !primaryEmail) {
        console.error('[GoogleStrategy] Invalid profile payload', {
          hasId: !!id,
          hasEmail: !!primaryEmail,
          state: normalizedState,
          profileProvider: profile?.provider,
        });
        return done(null, false, { message: 'Google profile missing required fields' });
      }

      const user = {
        googleId: id,
        email: primaryEmail,
        name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim() || primaryEmail,
        picture: photos?.[0]?.value,
        emailVerified: emails?.[0]?.verified ?? true,
      };

      return done(null, user);
    } catch (error: any) {
      console.error('[GoogleStrategy] validate() failed', {
        message: error?.message,
        stack: error?.stack,
      });
      return done(null, false, { message: error?.message || 'Google strategy validation failed' });
    }
  }
}
