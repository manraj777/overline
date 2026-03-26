import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleOAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.path || '';
    const isCallback = path.endsWith('/google/callback');
    const from = request.query?.from || request.query?.state || 'user';
    const safeState = from === 'admin' ? 'admin' : 'user';

    this.logger.log(
      `[OAuth Step 1] state received | path=${path} | rawState=${String(from)} | normalizedState=${safeState} | callback=${isCallback}`,
    );

    if (isCallback) {
      return {
        scope: ['email', 'profile'],
        session: false,
      };
    }

    return {
      state: safeState,
      scope: ['email', 'profile'],
      session: false,
    };
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.error(`Google OAuth error: ${err.message}`, err.stack);
      return null;
    }
    if (!user) {
      this.logger.warn(
        `[OAuth Guard] no user returned | info=${JSON.stringify(info)} | message=${info?.message || 'unknown'}`,
      );
      return null;
    }
    this.logger.log(`Google OAuth: user authenticated - ${user.email}`);
    return user;
  }
}
