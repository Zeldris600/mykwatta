import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { ApiConfigService } from '@mykwatta/core/config';
import { NodeEnvironment } from '@mykwatta/core/config/env.validation';
import { SeedIds } from '@mykwatta/core/database/seeder/data';
import { SeederService } from '@mykwatta/core/database/seeder/seeder.service';
import { user } from '@mykwatta/core/database/schema/auth.schema';
import { DRIZZLE } from './drizzle.tokens';
import type { DrizzleDb } from './drizzle.provider';

/**
 * When NODE_ENV=development (API process only): migrate `DATABASE_URL`, then
 * seed if empty. Set SEED_ON_BOOT=true to wipe+seed every boot.
 */
@Injectable()
export class DatabaseBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrap.name);

  constructor(
    private readonly config: ApiConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly seeder: SeederService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.nodeEnv !== NodeEnvironment.Development) {
      return;
    }
    if (process.env.APP_ROLE === 'worker') {
      return;
    }

    await this.migrate();
    await this.seedIfNeeded();
  }

  private async migrate(): Promise<void> {
    const migrationsFolder = this.resolveMigrationsFolder();
    this.logger.log(`Applying migrations from ${migrationsFolder}`);
    await migrate(this.db, { migrationsFolder });
    this.logger.log('Migrations up to date');
  }

  private async seedIfNeeded(): Promise<void> {
    const force =
      process.env.SEED_ON_BOOT === 'true' || process.env.SEED_ON_BOOT === '1';

    if (!force) {
      const existing = await this.db.query.user.findFirst({
        where: eq(user.id, SeedIds.users.admin),
        columns: { id: true },
      });
      if (existing) {
        this.logger.log(
          'Seed skipped (fixtures already present). Set SEED_ON_BOOT=true to wipe+seed.',
        );
        return;
      }
    }

    this.logger.log(
      force ? 'SEED_ON_BOOT=true — wipe + seed' : 'Empty DB — running seed',
    );
    await this.seeder.run();
  }

  private resolveMigrationsFolder(): string {
    const candidates = [
      join(process.cwd(), 'src/core/database/migrations'),
      join(process.cwd(), 'dist/core/database/migrations'),
    ];
    const found = candidates.find((path) => existsSync(path));
    if (!found) {
      throw new Error(
        `Drizzle migrations folder not found. Tried: ${candidates.join(', ')}`,
      );
    }
    return found;
  }
}
