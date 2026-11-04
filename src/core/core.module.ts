import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config';
import {
  HttpExceptionFilter,
  LoggingInterceptor,
  RequestContextMiddleware,
  RequestContextService,
  TransformInterceptor,
  createValidationPipe,
  AppLogger,
} from './common';
import { HealthController } from './common/health/health.controller';
import { DatabaseModule } from './database';
import { CacheModule } from '../shared/cache';

@Global()
@Module({
  imports: [AppConfigModule, DatabaseModule, CacheModule],
  controllers: [HealthController],
  providers: [
    RequestContextService,
    AppLogger,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_PIPE,
      useFactory: createValidationPipe,
    },
  ],
  exports: [AppConfigModule, DatabaseModule, RequestContextService, AppLogger],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
