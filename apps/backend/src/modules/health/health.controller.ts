import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint — verifies DB and Redis connectivity' })
  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (err: any) {
      checks.database = `error: ${err.message?.slice(0, 100)}`;
      this.logger.error('Health check — database unreachable', err.message);
    }

    // Redis check
    try {
      await this.redis.set('health:ping', 'pong', 10);
      const val = await this.redis.get('health:ping');
      checks.redis = val === 'pong' ? 'ok' : 'degraded';
    } catch (err: any) {
      checks.redis = `error: ${err.message?.slice(0, 100)}`;
      this.logger.error('Health check — redis unreachable', err.message);
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      ...checks,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  }
}
