import { Provider } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ApiConfigService } from '../config/api-config.service';
import { DRIZZLE } from './drizzle.tokens';
import * as schema from './schema';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [ApiConfigService],
  useFactory: (config: ApiConfigService): DrizzleDb => {
    const client = postgres(config.databaseUrl, {
      max: 10,
      prepare: false,
    });
    return drizzle(client, { schema });
  },
};
