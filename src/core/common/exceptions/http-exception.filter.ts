import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException, AppExceptionBody } from './app.exception';
import { ErrorCode, ErrorCodes } from './error-codes';

interface NormalizedError {
  status: number;
  code: ErrorCode;
  message: string | string[];
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);
    const isProduction = process.env.NODE_ENV === 'production';

    if (normalized.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} code=${normalized.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} code=${normalized.code} message=${JSON.stringify(normalized.message)}`,
      );
    }

    const safeMessage =
      isProduction && normalized.status >= 500
        ? 'An unexpected error occurred'
        : normalized.message;

    response.status(normalized.status).json({
      success: false,
      statusCode: normalized.status,
      code: normalized.code,
      message: safeMessage,
      ...(normalized.details !== undefined && !isProduction
        ? { details: normalized.details }
        : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'],
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof AppException) {
      const body = exception.getResponse() as AppExceptionBody;
      return {
        status: exception.getStatus(),
        code: body.code,
        message: body.message,
        details: body.details,
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    const postgres = this.fromPostgres(exception);
    if (postgres) {
      return postgres;
    }

    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.INTERNAL,
        message: exception.message || 'Internal server error',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.INTERNAL,
      message: 'Internal server error',
    };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        status,
        code: this.codeFromStatus(status),
        message: response,
      };
    }

    if (typeof response === 'object' && response !== null) {
      const body = response as Record<string, unknown>;
      const message =
        typeof body.message === 'string' || Array.isArray(body.message)
          ? (body.message as string | string[])
          : exception.message;

      const code =
        typeof body.code === 'string' && this.isErrorCode(body.code)
          ? body.code
          : this.codeFromStatus(status);

      return {
        status,
        code,
        message,
        details: body.error ?? body.details,
      };
    }

    return {
      status,
      code: this.codeFromStatus(status),
      message: exception.message,
    };
  }

  private fromPostgres(exception: unknown): NormalizedError | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const error = exception as {
      code?: string;
      detail?: string;
      message?: string;
      constraint_name?: string;
      constraint?: string;
    };

    // PostgreSQL unique_violation
    if (error.code === '23505') {
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCodes.CONFLICT,
        message: 'Resource already exists',
        details: error.detail ?? error.constraint_name ?? error.constraint,
      };
    }

    // foreign_key_violation
    if (error.code === '23503') {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
        message: 'Related resource does not exist',
        details: error.detail,
      };
    }

    // not_null_violation / check_violation
    if (error.code === '23502' || error.code === '23514') {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Invalid data for persistence',
        details: error.detail ?? error.message,
      };
    }

    // connection failures
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === '57P01' ||
      error.code === '57P03'
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Database is unavailable',
        details: error.message,
      };
    }

    return null;
  }

  private codeFromStatus(status: number): ErrorCode {
    if (status === 400) return ErrorCodes.VALIDATION_FAILED;
    if (status === 401) return ErrorCodes.UNAUTHORIZED;
    if (status === 403) return ErrorCodes.FORBIDDEN;
    if (status === 404) return ErrorCodes.NOT_FOUND;
    if (status === 409) return ErrorCodes.CONFLICT;
    if (status === 502) return ErrorCodes.EXTERNAL_SERVICE_ERROR;
    if (status === 503) return ErrorCodes.SERVICE_UNAVAILABLE;
    return status >= 500 ? ErrorCodes.INTERNAL : ErrorCodes.BAD_REQUEST;
  }

  private isErrorCode(value: string): value is ErrorCode {
    return Object.values(ErrorCodes).includes(value as ErrorCode);
  }
}
