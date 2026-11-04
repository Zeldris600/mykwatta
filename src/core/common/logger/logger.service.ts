import { ConsoleLogger, Injectable, LogLevel, Scope } from '@nestjs/common';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  constructor(private readonly requestContext: RequestContextService) {
    super();
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    const requestId = this.requestContext.requestId;
    const organisationId = this.requestContext.organisationId;
    const prefix = [
      requestId ? `req=${requestId}` : null,
      organisationId ? `org=${organisationId}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const base = super.formatMessage(
      logLevel,
      message,
      pidMessage,
      formattedLogLevel,
      contextMessage,
      timestampDiff,
    );

    return prefix ? `${prefix} ${base}` : base;
  }
}
