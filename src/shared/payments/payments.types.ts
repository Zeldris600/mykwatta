import type { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import type { PaymentProviderName } from '@mykwatta/modules/payments/constants';

export type CreateCheckoutInput = {
  /** Our payment row id — used as externalId / metadata. */
  paymentId: string;
  userId: string;
  email?: string;
  amountMinor: number;
  currency: CurrencyCode;
  description: string;
  redirectUrl: string;
};

export type CreateCheckoutResult = {
  provider: PaymentProviderName;
  providerRef: string;
  checkoutUrl?: string;
  status: 'PENDING' | 'REQUIRES_ACTION';
};

export type ProviderPaymentStatus = {
  providerRef: string;
  status: 'PENDING' | 'REQUIRES_ACTION' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
  raw?: unknown;
};

export interface CheckoutPaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  getStatus(providerRef: string): Promise<ProviderPaymentStatus>;
}
