import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { ApiConfigService } from '@mykwatta/core/config';
import { PaymentProviderName } from '@mykwatta/modules/payments/constants';
import type {
  CheckoutPaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  ProviderPaymentStatus,
} from '../payments.types';

/** International card checkout via Stripe Checkout Sessions. */
@Injectable()
export class StripePaymentProvider implements CheckoutPaymentProvider {
  readonly name = PaymentProviderName.STRIPE;
  private readonly logger = new Logger(StripePaymentProvider.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ApiConfigService) {
    this.stripe = config.stripeSecretKey
      ? new Stripe(config.stripeSecretKey)
      : null;
  }

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const stripe = this.requireClient();

    if (
      input.currency !== CurrencyCode.USD &&
      input.currency !== CurrencyCode.EUR
    ) {
      throw AppException.badRequest(
        'Stripe checkout currently supports USD and EUR',
      );
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: input.email,
        client_reference_id: input.paymentId,
        success_url: `${input.redirectUrl}?paymentId=${input.paymentId}&status=success`,
        cancel_url: `${input.redirectUrl}?paymentId=${input.paymentId}&status=cancel`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountMinor,
              product_data: {
                name: input.description.slice(0, 120),
              },
            },
          },
        ],
        metadata: {
          paymentId: input.paymentId,
          userId: input.userId,
        },
      });

      if (!session.url || !session.id) {
        throw AppException.external(
          'Stripe Checkout Session missing url or id',
        );
      }

      return {
        provider: PaymentProviderName.STRIPE,
        providerRef: session.id,
        checkoutUrl: session.url,
        status: 'REQUIRES_ACTION',
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `Stripe checkout failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw AppException.external('Failed to create Stripe checkout session', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    const stripe = this.requireClient();
    try {
      const session = await stripe.checkout.sessions.retrieve(providerRef);
      return {
        providerRef: session.id,
        status: this.mapStatus(session.payment_status, session.status),
        raw: session,
      };
    } catch (error) {
      throw AppException.external('Failed to load Stripe checkout session', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = this.requireClient();
    const secret = this.config.stripeWebhookSecret;
    if (!secret) {
      throw AppException.external('STRIPE_WEBHOOK_SECRET is required');
    }
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  private mapStatus(
    paymentStatus: Stripe.Checkout.Session.PaymentStatus,
    sessionStatus: Stripe.Checkout.Session.Status | null,
  ): ProviderPaymentStatus['status'] {
    if (paymentStatus === 'paid') {
      return 'SUCCEEDED';
    }
    if (sessionStatus === 'expired') {
      return 'EXPIRED';
    }
    if (paymentStatus === 'unpaid') {
      return 'PENDING';
    }
    return 'PENDING';
  }

  private requireClient(): Stripe {
    if (!this.stripe) {
      throw AppException.external('Stripe requires STRIPE_SECRET_KEY');
    }
    return this.stripe;
  }
}
