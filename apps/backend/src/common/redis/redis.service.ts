import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password') || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    this.client.on('connect', () => {
      console.log('🔴 Redis connected');
    });

    this.client.on('error', (error) => {
      console.error('Redis error:', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // ============================================================================
  // Basic Operations
  // ============================================================================

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // ============================================================================
  // JSON Operations (using string serialization)
  // ============================================================================

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, data);
    } else {
      await this.client.set(key, data);
    }
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  // ============================================================================
  // List Operations (for queues)
  // ============================================================================

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  // ============================================================================
  // Sorted Set Operations (for priority queues, leaderboards)
  // ============================================================================

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.client.zrem(key, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max);
  }

  async zrank(key: string, member: string): Promise<number | null> {
    return this.client.zrank(key, member);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  // ============================================================================
  // Pub/Sub (for real-time updates)
  // ============================================================================

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
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
    const key = `queue:shop:${shopId}`;
    await this.client.hset(key, 'waitingCount', stats.waitingCount.toString());
    await this.client.hset(key, 'estimatedWaitMinutes', stats.estimatedWaitMinutes.toString());
    if (stats.nextSlot) {
      await this.client.hset(key, 'nextSlot', stats.nextSlot);
    }
    await this.expire(key, 3600); // 1 hour TTL
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
