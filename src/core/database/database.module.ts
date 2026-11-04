import { Global, Module } from '@nestjs/common';
import { SeederService } from '@mykwatta/core/database/seeder/seeder.service';
import { DatabaseBootstrap } from './database.bootstrap';
import { drizzleProvider } from './drizzle.provider';
import { DRIZZLE } from './drizzle.tokens';

@Global()
@Module({
  providers: [drizzleProvider, SeederService, DatabaseBootstrap],
  exports: [DRIZZLE, SeederService],
})
export class DatabaseModule {}
