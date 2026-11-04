import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SeederModule } from '@mykwatta/core/database/seeder';
import { SeederService } from '@mykwatta/core/database/seeder/seeder.service';

async function bootstrap() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(SeederModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seeder = app.get(SeederService);
    await seeder.run();
  } catch (error) {
    logger.error(
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
