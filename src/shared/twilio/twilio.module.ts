import { Global, Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { WhatsappInboundService } from './whatsapp-inbound.service';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';

@Global()
@Module({
  controllers: [WhatsappWebhookController],
  providers: [TwilioService, WhatsappInboundService],
  exports: [TwilioService, WhatsappInboundService],
})
export class TwilioModule {}
