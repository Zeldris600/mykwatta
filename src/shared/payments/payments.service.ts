import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { ApiConfigService } from '@mykwatta/core/config';
import { PaymentsMode } from '@mykwatta/core/config/env.validation';
import {
  PaymentChannel,
  PaymentProviderName,
} from '@mykwatta/modules/payments/constants';
import {
  CONSOLE_PAYMENT_PROVIDER,
  FAPSHI_PAYMENT_PROVIDER,
  STRIPE_PAYMENT_PROVIDER,
} from './payments.tokens';
import type {
  CheckoutPaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  ProviderPaymentStatus,
} from './payments.types';
import { StripePaymentProvider } from './providers/stripe.payment-provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly config: ApiConfigService,
    @Inject(CONSOLE_PAYMENT_PROVIDER)
    private readonly consoleProvider: CheckoutPaymentProvider,
    @Inject(FAPSHI_PAYMENT_PROVIDER)
    private readonly fapshiProvider: CheckoutPaymentProvider,
    @Inject(STRIPE_PAYMENT_PROVIDER)
    private readonly stripeProvider: CheckoutPaymentProvider,
    private readonly stripe: StripePaymentProvider,
  ) {}

  resolveProviderName(
    channel: PaymentChannel,
    currency: CurrencyCode,
  ): PaymentProviderName {
    if (this.config.paymentsMode === PaymentsMode.CONSOLE) {
      return PaymentProviderName.CONSOLE;
    }

    if (channel === PaymentChannel.MOBILE_MONEY) {
      if (currency !== CurrencyCode.XAF) {
        throw AppException.badRequest(
          'Mobile money deposits must use XAF (Fapshi)',
        );
      }
      return PaymentProviderName.FAPSHI;
    }

    if (channel === PaymentChannel.CARD) {
      if (currency === CurrencyCode.XAF) {
        throw AppException.badRequest(
          'Card deposits should use USD or EUR (Stripe); use MOBILE_MONEY for XAF',
        );
      }
      return PaymentProviderName.STRIPE;
    }

    const exhaustive: never = channel;
    return exhaustive;
  }

  createCheckout(
    providerName: PaymentProviderName,
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    return this.provider(providerName).createCheckout(input);
  }

  getStatus(
    providerName: PaymentProviderName,
    providerRef: string,
  ): Promise<ProviderPaymentStatus> {
    return this.provider(providerName).getStatus(providerRef);
  }

  constructStripeWebhookEvent(rawBody: Buffer, signature: string) {
    return this.stripe.constructWebhookEvent(rawBody, signature);
  }

  private provider(name: PaymentProviderName): CheckoutPaymentProvider {
    switch (name) {
      case PaymentProviderName.CONSOLE:
        return this.consoleProvider;
      case PaymentProviderName.FAPSHI:
        return this.fapshiProvider;
      case PaymentProviderName.STRIPE:
        return this.stripeProvider;
      default: {
        const exhaustive: never = name;
        return exhaustive;
      }
    }
  }
}
