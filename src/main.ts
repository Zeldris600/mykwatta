import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from '@mykwatta/app.module';
import { APP_GLOBAL_PREFIX } from '@mykwatta/core/common/constants/app.constants';
import { ApiConfigService } from '@mykwatta/core/config';

async function bootstrap() {
  // Required by Better Auth so it can parse its own request bodies.
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    rawBody: true,
  });

  const config = app.get(ApiConfigService);

  // Stripe signature verification needs the unmodified body bytes.
  app.use(
    `/${APP_GLOBAL_PREFIX}/webhooks/stripe`,
    express.raw({ type: 'application/json' }),
  );

  app.setGlobalPrefix(APP_GLOBAL_PREFIX);
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });
  app.use(helmet());
  app.use(compression());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('MYKWATTA API')
    .setDescription('MYKWATTA modular monolith API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );

  await app.listen(config.port);
}

void bootstrap();
