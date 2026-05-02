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

  handleRequest(err: any, user: any, info: any, context: any) {
    if (err) {
      this.logger.error(
        `[OAuth Guard] Google OAuth error: ${err.message}`,
        err.stack,
      );
      // Attach error to request so the controller can read it
      try {
        const request = context?.switchToHttp?.()?.getRequest?.();
        if (request) {
          request._googleOAuthError = err.message || 'unknown';
        }
      } catch {}
      return null;
    }
    if (!user) {
      const reason = info?.message || (typeof info === 'string' ? info : 'unknown');
      this.logger.warn(
        `[OAuth Guard] no user returned | info=${JSON.stringify(info)} | message=${reason}`,
      );
      // Attach info to request for better error reporting
      try {
        const request = context?.switchToHttp?.()?.getRequest?.();
        if (request) {
          request._googleOAuthError = reason;
        }
      } catch {}
      return null;
    }
    this.logger.log(`Google OAuth: user authenticated - ${user.email}`);
    return user;
  }
}
