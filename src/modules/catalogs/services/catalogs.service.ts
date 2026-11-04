import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import {
  amenityCatalog,
  landmarkCatalog,
} from '@mykwatta/core/database/schema/catalogs.schema';
import { seedCatalogs } from '@mykwatta/core/database/seeder/seed-catalogs';

@Injectable()
export class CatalogsService {
  private readonly logger = new Logger(CatalogsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listAmenities() {
    await this.ensureSeeded();
    return this.db.select().from(amenityCatalog).orderBy(asc(amenityCatalog.nameEn));
  }

  async listLandmarks() {
    await this.ensureSeeded();
    return this.db
      .select()
      .from(landmarkCatalog)
      .orderBy(asc(landmarkCatalog.nameEn));
  }

  private async ensureSeeded(): Promise<void> {
    try {
      await seedCatalogs(this.db);
    } catch (error) {
      this.logger.error(
        `catalog seed failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw AppException.database('Failed to load catalogs', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
