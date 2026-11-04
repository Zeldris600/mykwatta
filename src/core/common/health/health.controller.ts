import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { sql } from 'drizzle-orm';
import { AppException } from '../exceptions/app.exception';
import { DRIZZLE } from '../../database';
import type { DrizzleDb } from '../../database';
import { CacheService } from '../../../shared/cache';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
  ) {}

  @Get('live')
  @AllowAnonymous()
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @AllowAnonymous()
  async ready() {
    try {
      await this.db.execute(sql`select 1`);
    } catch (error) {
      throw AppException.unavailable('Database readiness check failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await this.cache.ping();
    } catch (error) {
      if (error instanceof AppException) {
        throw AppException.unavailable('Cache readiness check failed', {
          reason: error.message,
          details: error.details,
        });
      }
      throw AppException.unavailable('Cache readiness check failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    return { status: 'ok' };
  }
}
