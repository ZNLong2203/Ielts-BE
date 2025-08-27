import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: Number(this.configService.get('REDIS_PORT')),
      password: this.configService.get('REDIS_PASSWORD'),
    });

    this.redis.on('connect', () => {
      this.logger.log('✅ Connected to Redis via RedisService');
    });

    this.redis.on('error', (err) => {
      this.logger.error('❌ Redis connection error:', err);
    });
  }

  getClient(): Redis {
    return this.redis;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string) {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis:`, error);
      throw error;
    }
  }

  async del(key: string) {
    try {
      return await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis:`, error);
      throw error;
    }
  }

  async setJSON(key: string, value: unknown, ttlSeconds?: number) {
    return this.set(key, JSON.stringify(value), ttlSeconds || 3600);
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Failed to parse JSON from Redis key ${key}`, err);
      return null;
    }
  }

  onModuleDestroy() {
    this.redis.quit().catch((err) => {
      this.logger.error('Error quitting Redis client:', err);
    });
  }
}
