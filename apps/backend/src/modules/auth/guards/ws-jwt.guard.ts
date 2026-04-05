import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const authHeader = client.handshake.headers?.authorization;
      const token = authHeader?.split(' ')[1] || (client.handshake.auth?.token as string);

      if (!token) {
        throw new WsException('Unauthorized: Missing token');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Attach user to context for CurrentUser decorator
      client['user'] = payload;
      return true;
    } catch (err) {
      this.logger.error(`WS Authorization failed: ${err.message}`);
      throw new WsException('Unauthorized');
    }
  }
}
