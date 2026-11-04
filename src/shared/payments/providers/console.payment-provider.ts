import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderName } from '@mykwatta/modules/payments/constants';
import type {
  CheckoutPaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  ProviderPaymentStatus,
} from '../payments.types';

@Injectable()
export class ConsolePaymentProvider implements CheckoutPaymentProvider {
  readonly name = PaymentProviderName.CONSOLE;
  private readonly logger = new Logger(ConsolePaymentProvider.name);

  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerRef = `console_${input.paymentId}`;
    this.logger.log(
      `[console payments] checkout paymentId=${input.paymentId} amountMinor=${input.amountMinor} ${input.currency} user=${input.userId}`,
    );
    return Promise.resolve({
      provider: PaymentProviderName.CONSOLE,
      providerRef,
      checkoutUrl: `console://pay/${input.paymentId}`,
      status: 'REQUIRES_ACTION',
    });
  }

  getStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    return Promise.resolve({
      providerRef,
      status: 'PENDING',
    });
  }
}
