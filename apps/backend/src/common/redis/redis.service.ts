import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl = this.configService.get('redis.url');
      
      const redisOptions: any = {
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed after 3 retries - continuing without Redis');
            return null;
          }
          return Math.min(times * 200, 1000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
      };

      if (redisUrl) {
        this.logger.log('Connecting to Redis via URL...');
        this.client = new Redis(redisUrl, redisOptions);
      } else {
        this.logger.log('Connecting to Redis via host/port...');
        this.client = new Redis({
          ...redisOptions,
          host: this.configService.get('redis.host'),
          port: this.configService.get('redis.port'),
          password: this.configService.get('redis.password') || undefined,
        });
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('✅ Redis connected');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        this.logger.warn(`Redis error: ${error.message}`);
      });

      // Try to connect but don't block startup
      await this.client.connect().catch((err) => {
        this.logger.warn(`Redis initial connection failed: ${err.message} - app will continue without Redis`);
      });
    } catch (error) {
      this.logger.warn(`Redis setup failed: ${error.message} - app will continue without Redis`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  // ============================================================================
  // Basic Operations
  // ============================================================================

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {}
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {}
  }

  // ============================================================================
  // JSON Operations (using string serialization)
  // ============================================================================

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const data = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, data);
      } else {
        await this.client.set(key, data);
      }
    } catch {}
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.hget(key, field);
    } catch {
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.hset(key, field, value);
    } catch {}
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) return {};
    try {
      return await this.client.hgetall(key);
    } catch {
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.hdel(key, field);
    } catch {}
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.hincrby(key, field, increment);
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // List Operations (for queues)
  // ============================================================================

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.lpush(key, ...values);
    } catch {
      return 0;
    }
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.rpush(key, ...values);
    } catch {
      return 0;
    }
  }

  async lpop(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.lpop(key);
    } catch {
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.rpop(key);
    } catch {
      return null;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.lrange(key, start, stop);
    } catch {
      return [];
    }
  }

  async llen(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.llen(key);
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.sadd(key, ...members);
    } catch {
      return 0;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.srem(key, ...members);
    } catch {
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.smembers(key);
    } catch {
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Sorted Set Operations (for priority queues, leaderboards)
  // ============================================================================

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zadd(key, score, member);
    } catch {
      return 0;
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zrem(key, member);
    } catch {
      return 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.zrange(key, start, stop);
    } catch {
      return [];
    }
  }

  async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.zrangebyscore(key, min, max);
    } catch {
      return [];
    }
  }

  async zrank(key: string, member: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.zrank(key, member);
    } catch {
      return null;
    }
  }

  async zcard(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.zcard(key);
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Pub/Sub (for real-time updates)
  // ============================================================================

  async publish(channel: string, message: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.publish(channel, message);
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Queue-specific helpers for Overline
  // ============================================================================

  // Get queue stats for a shop
  async getShopQueueStats(shopId: string): Promise<{
    waitingCount: number;
    estimatedWaitMinutes: number;
    nextSlot: string | null;
  } | null> {
    const key = `queue:shop:${shopId}`;
    const data = await this.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    return {
      waitingCount: parseInt(data.waitingCount || '0'),
      estimatedWaitMinutes: parseInt(data.estimatedWaitMinutes || '0'),
      nextSlot: data.nextSlot || null,
    };
  }

  // Update queue stats for a shop
  async updateShopQueueStats(
    shopId: string,
    stats: { waitingCount: number; estimatedWaitMinutes: number; nextSlot?: string },
  ): Promise<void> {
    if (!this.client) return;
    try {
      const key = `queue:shop:${shopId}`;
      await this.client.hset(key, 'waitingCount', stats.waitingCount.toString());
      await this.client.hset(key, 'estimatedWaitMinutes', stats.estimatedWaitMinutes.toString());
      if (stats.nextSlot) {
        await this.client.hset(key, 'nextSlot', stats.nextSlot);
      }
      await this.expire(key, 3600); // 1 hour TTL
    } catch {}
  }

  // Cache available slots for a shop+date
  async cacheSlots(shopId: string, date: string, slots: string[]): Promise<void> {
    const key = `slots:${shopId}:${date}`;
    await this.setJson(key, slots, 300); // 5 minutes TTL
  }

  async getCachedSlots(shopId: string, date: string): Promise<string[] | null> {
    const key = `slots:${shopId}:${date}`;
    return this.getJson<string[]>(key);
  }

  async invalidateSlots(shopId: string, date?: string): Promise<void> {
    if (date) {
      await this.del(`slots:${shopId}:${date}`);
    } else {
      // Invalidate all slots for this shop (scan and delete)
      const keys = await this.client.keys(`slots:${shopId}:*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    }
  }
}
