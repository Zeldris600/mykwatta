import { Global, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CONSOLE_PAYMENT_PROVIDER,
  FAPSHI_PAYMENT_PROVIDER,
  STRIPE_PAYMENT_PROVIDER,
} from './payments.tokens';
import {
  ConsolePaymentProvider,
  FapshiPaymentProvider,
  StripePaymentProvider,
} from './providers';

@Global()
@Module({
  providers: [
    ConsolePaymentProvider,
    FapshiPaymentProvider,
    StripePaymentProvider,
    {
      provide: CONSOLE_PAYMENT_PROVIDER,
      useExisting: ConsolePaymentProvider,
    },
    {
      provide: FAPSHI_PAYMENT_PROVIDER,
      useExisting: FapshiPaymentProvider,
    },
    {
      provide: STRIPE_PAYMENT_PROVIDER,
      useExisting: StripePaymentProvider,
    },
    PaymentsService,
  ],
  exports: [PaymentsService, StripePaymentProvider],
})
export class PaymentsInfraModule {}
