import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@mykwatta/app.module';

/**
 * Worker process: boots the Nest context so BullMQ `@Processor` workers run.
 * Register processors in feature modules; they start with this process.
 */
async function bootstrap() {
  process.env.APP_ROLE = 'worker';
  const logger = new Logger('Worker');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();

  logger.log('MYKWATTA BullMQ worker started');
}

void bootstrap();
