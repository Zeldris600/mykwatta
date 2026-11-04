import { Module } from '@nestjs/common';
import { AppConfigModule } from '@mykwatta/core/config';
import { DatabaseModule } from '@mykwatta/core/database/database.module';
import { SeederService } from './seeder.service';

/** Slim context for CLI seeding — Config + Database only. */
@Module({
  imports: [AppConfigModule, DatabaseModule],
  exports: [SeederService],
})
export class SeederModule {}
