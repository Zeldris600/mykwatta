import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodes } from './error-codes';

export interface AppExceptionBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    const body: AppExceptionBody = { code, message, details };
    super(body, status);
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.BAD_REQUEST,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  static notFound(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.NOT_FOUND,
      message,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  static conflict(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.CONFLICT,
      message,
      HttpStatus.CONFLICT,
      details,
    );
  }

  static forbidden(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.FORBIDDEN,
      message,
      HttpStatus.FORBIDDEN,
      details,
    );
  }

  static database(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.DATABASE_ERROR,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }

  static cache(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.CACHE_ERROR,
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }

  static queue(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.QUEUE_ERROR,
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }

  static external(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      message,
      HttpStatus.BAD_GATEWAY,
      details,
    );
  }

  static unavailable(message: string, details?: unknown): AppException {
    return new AppException(
      ErrorCodes.SERVICE_UNAVAILABLE,
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }
}
