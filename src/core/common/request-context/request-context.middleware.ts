import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  ORGANISATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from '../constants/app.constants';
import { createId } from '../utils/uuid.util';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? createId();
    const organisationId = req.headers[ORGANISATION_ID_HEADER] as
      string | undefined;

    res.setHeader(REQUEST_ID_HEADER, requestId);

    this.requestContext.run({ requestId, organisationId }, () => next());
  }
}
