import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ApiConfigService } from '../../core/config';
import { AppException } from '../../core/common/exceptions/app.exception';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client!: Redis;

  constructor(private readonly config: ApiConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn(
        `Redis quit failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.client.disconnect();
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
    } catch (error) {
      throw this.wrap(error, 'Failed to connect to Redis');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.connect();
      return await this.client.get(key);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw this.wrap(error, `Failed to read cache key ${key}`);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      await this.connect();
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      }
      await this.client.set(key, value);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw this.wrap(error, `Failed to write cache key ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw this.wrap(error, `Failed to delete cache key ${key}`);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      await this.connect();
      return await this.client.incr(key);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw this.wrap(error, `Failed to increment cache key ${key}`);
    }
  }

  async ping(): Promise<string> {
    try {
      await this.connect();
      return await this.client.ping();
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw this.wrap(error, 'Redis ping failed');
    }
  }

  private wrap(error: unknown, message: string): AppException {
    const reason = error instanceof Error ? error.message : String(error);
    this.logger.error(`${message}: ${reason}`);
    return AppException.cache(message, { reason });
  }
}
