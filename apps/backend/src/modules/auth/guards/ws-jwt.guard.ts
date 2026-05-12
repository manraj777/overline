import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const authHeader = client.handshake.headers?.authorization;
      const token = authHeader?.split(' ')[1] || (client.handshake.auth?.token as string);

      if (!token) {
        throw new WsException('Unauthorized: Missing token');
      }

      // IMPORTANT: do NOT pass `{ secret: ... }` here. The JwtModule was
      // registered with `resolveJwtSecret()` which Base64-decodes JWT_SECRET
      // into a Buffer. Overriding with the raw string would verify tokens
      // against a different key than they were signed with, producing
      // `invalid signature` for every otherwise-valid token.
      const payload = await this.jwtService.verifyAsync(token);

      // Attach user to context for CurrentUser decorator
      client['user'] = payload;
      return true;
    } catch (err) {
      this.logger.error(`WS Authorization failed: ${err.message}`);
      throw new WsException('Unauthorized');
    }
  }
}
