import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { PaymentsAppService } from '@mykwatta/modules/payments/services/payments-app.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsApp: PaymentsAppService) {}

  @Post('fapshi')
  @AllowAnonymous()
  fapshi(
    @Body() body: Record<string, unknown>,
    @Headers('x-wh-secret') webhookSecret: string | undefined,
  ) {
    return this.paymentsApp.handleFapshiWebhook(body, webhookSecret);
  }

  @Post('stripe')
  @AllowAnonymous()
  stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const raw =
      req.rawBody ??
      (Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === 'string'
          ? Buffer.from(req.body)
          : undefined);

    if (!raw) {
      throw AppException.badRequest(
        'Stripe webhook requires raw body (configure express.raw for /api/webhooks/stripe)',
      );
    }

    return this.paymentsApp.handleStripeWebhook(raw, signature);
  }
}
