import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from '@mykwatta/app.module';
import { APP_GLOBAL_PREFIX } from '@mykwatta/core/common/constants/app.constants';
import { ApiConfigService } from '@mykwatta/core/config';
import { NodeEnvironment } from '@mykwatta/core/config/env.validation';

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

  // Same host as Swagger. An absolute BETTER_AUTH_URL of localhost sends the browser off the server.
  const authReferenceUrl = `/${APP_GLOBAL_PREFIX}/auth/reference`;
  const showDevOtp =
    config.nodeEnv === NodeEnvironment.Development ||
    config.nodeEnv === NodeEnvironment.Test;
  const swaggerDescription = [
    'MYKWATTA modular monolith API.',
    '',
    `**Phone OTP (Better Auth try-it):** [Open Auth Reference](${authReferenceUrl})`,
    showDevOtp
      ? `**Dev OTP:** use \`${process.env.AUTH_DEV_OTP ?? '000000'}\` after send-otp (fixed in development/test).`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  /* type-aware lint occasionally fails to resolve @nestjs/swagger builders */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
  const swagger = new DocumentBuilder()
    .setTitle('MYKWATTA API')
    .setDescription(swaggerDescription)
    .setVersion('0.1.0')
    .addBearerAuth()
    .setExternalDoc('Better Auth reference (phone OTP)', authReferenceUrl)
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

  await app.listen(config.port);
}

void bootstrap();
