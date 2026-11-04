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
import twilio from 'twilio';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { APP_GLOBAL_PREFIX } from '@mykwatta/core/common/constants/app.constants';
import { ApiConfigService } from '@mykwatta/core/config';
import { TwilioMode } from '@mykwatta/core/config/env.validation';
import { WhatsappInboundService } from '@mykwatta/shared/twilio/whatsapp-inbound.service';

@ApiTags('webhooks')
@Controller('webhooks/twilio')
export class WhatsappWebhookController {
  constructor(
    private readonly inbound: WhatsappInboundService,
    private readonly config: ApiConfigService,
  ) {}

  @Post('whatsapp')
  @AllowAnonymous()
  async whatsapp(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: Record<string, string>,
    @Headers('x-twilio-signature') signature: string | undefined,
  ) {
    this.assertTwilioSignature(req, body, signature);
    await this.inbound.handleInbound(body);
    return { ok: true };
  }

  private assertTwilioSignature(
    req: RawBodyRequest<Request>,
    body: Record<string, string>,
    signature: string | undefined,
  ): void {
    if (this.config.twilioMode === TwilioMode.Console) {
      return;
    }

    const authToken = this.config.twilioAuthToken;
    if (!authToken) {
      throw AppException.external(
        'TWILIO_AUTH_TOKEN is required to verify WhatsApp webhooks',
      );
    }
    if (!signature) {
      throw AppException.forbidden('Missing X-Twilio-Signature header');
    }

    const protocol =
      (req.headers['x-forwarded-proto'] as string | undefined) ??
      req.protocol ??
      'https';
    const host = req.headers.host ?? 'localhost';
    const url = `${protocol}://${host}/${APP_GLOBAL_PREFIX}/webhooks/twilio/whatsapp`;

    const valid = twilio.validateRequest(authToken, signature, url, body);
    if (!valid) {
      throw AppException.forbidden('Invalid Twilio webhook signature');
    }
  }
}
