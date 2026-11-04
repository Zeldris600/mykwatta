import { Injectable, Logger } from '@nestjs/common';
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

/**
 * Fapshi collections (MTN MoMo / Orange Money) via initiate-pay.
 * @see https://docs.fapshi.com/en/api-reference/endpoint/initiate-pay
 */
@Injectable()
export class FapshiPaymentProvider implements CheckoutPaymentProvider {
  readonly name = PaymentProviderName.FAPSHI;
  private readonly logger = new Logger(FapshiPaymentProvider.name);

  constructor(private readonly config: ApiConfigService) {}

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    if (input.currency !== CurrencyCode.XAF) {
      throw AppException.badRequest('Fapshi only supports XAF amounts');
    }
    if (input.amountMinor < 100) {
      throw AppException.badRequest('Fapshi minimum amount is 100 XAF');
    }

    const body = {
      amount: input.amountMinor,
      email: input.email,
      redirectUrl: input.redirectUrl,
      userId: this.sanitizeId(input.userId),
      externalId: this.sanitizeId(input.paymentId),
      message: input.description.slice(0, 200),
    };

    const response = await this.request<{
      message?: string;
      link?: string;
      transId?: string;
    }>('POST', '/initiate-pay', body);

    if (!response.transId || !response.link) {
      throw AppException.external(
        'Fapshi initiate-pay returned an incomplete response',
        {
          response,
        },
      );
    }

    return {
      provider: PaymentProviderName.FAPSHI,
      providerRef: response.transId,
      checkoutUrl: response.link,
      status: 'REQUIRES_ACTION',
    };
  }

  async getStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    const response = await this.request<{
      transId?: string;
      status?: string;
    }>('GET', `/payment-status/${encodeURIComponent(providerRef)}`);

    return {
      providerRef: response.transId ?? providerRef,
      status: this.mapStatus(response.status),
      raw: response,
    };
  }

  private mapStatus(
    status: string | undefined,
  ): ProviderPaymentStatus['status'] {
    switch (status?.toUpperCase()) {
      case 'SUCCESSFUL':
        return 'SUCCEEDED';
      case 'FAILED':
        return 'FAILED';
      case 'EXPIRED':
        return 'EXPIRED';
      case 'PENDING':
      case 'CREATED':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  }

  private sanitizeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const baseUrl = this.config.fapshiBaseUrl?.replace(/\/$/, '');
    const apiUser = this.config.fapshiApiUser;
    const apiKey = this.config.fapshiApiKey;

    if (!baseUrl || !apiUser || !apiKey) {
      throw AppException.external(
        'Fapshi requires FAPSHI_BASE_URL, FAPSHI_API_USER, and FAPSHI_API_KEY',
      );
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          apiuser: apiUser,
          apikey: apiKey,
        },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      });

      const payload = (await response.json().catch(() => ({}))) as T & {
        message?: string;
      };

      if (!response.ok) {
        this.logger.error(
          `Fapshi ${method} ${path} failed status=${response.status} message=${payload.message ?? ''}`,
        );
        throw AppException.external('Fapshi API request failed', {
          status: response.status,
          message: payload.message,
        });
      }

      return payload;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.external('Fapshi API request failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
