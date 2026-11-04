import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { ApiConfigService } from '@mykwatta/core/config';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { payments } from '@mykwatta/core/database/schema/payments.schema';
import { ListingStatus } from '@mykwatta/modules/listings/constants';
import { ListingsService } from '@mykwatta/modules/listings/services';
import { EscrowService } from '@mykwatta/modules/escrow/services';
import {
  DepositAvailabilityStatus,
  PaymentProviderName,
  PaymentPurpose,
  PaymentStatus,
} from '@mykwatta/modules/payments/constants';
import { DepositAvailabilityService } from '@mykwatta/modules/payments/services/deposit-availability.service';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';
import type { CreateDepositDto } from '@mykwatta/modules/payments/dto';
import { PaymentsService } from '@mykwatta/shared/payments';

@Injectable()
export class PaymentsAppService {
  private readonly logger = new Logger(PaymentsAppService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listings: ListingsService,
    private readonly payments: PaymentsService,
    private readonly config: ApiConfigService,
    private readonly notifications: NotificationsService,
    private readonly escrow: EscrowService,
    private readonly depositAvailability: DepositAvailabilityService,
  ) {}

  async createDeposit(userId: string, input: CreateDepositDto) {
    try {
      const listing = await this.listings.getById(input.listingId);
      const availability = await this.depositAvailability.resolve(
        listing,
        userId,
      );

      if (availability.status === DepositAvailabilityStatus.PAID) {
        throw AppException.conflict(availability.message, {
          depositAvailability: availability,
        });
      }

      if (availability.status === DepositAvailabilityStatus.UNAVAILABLE) {
        if (listing.status === ListingStatus.PUBLISHED) {
          throw AppException.forbidden(availability.message, {
            depositAvailability: availability,
          });
        }
        throw AppException.conflict(availability.message, {
          depositAvailability: availability,
        });
      }

      if (availability.status === DepositAvailabilityStatus.OPEN_CHECKOUT) {
        if (!availability.paymentId) {
          throw AppException.conflict(availability.message);
        }
        return this.getMineById(availability.paymentId, userId);
      }

      if (input.amountMinor !== availability.requiredAmountMinor) {
        throw AppException.badRequest(
          `Deposit amount must be the full listing fee (${availability.requiredAmountMinor} ${availability.currency})`,
          {
            requiredAmountMinor: availability.requiredAmountMinor,
            currency: availability.currency,
          },
        );
      }

      if (input.currency !== availability.currency) {
        throw AppException.badRequest(
          `Deposit currency must be ${availability.currency}`,
        );
      }

      const providerName = this.payments.resolveProviderName(
        input.channel,
        input.currency,
      );

      const payer = await this.db.query.user.findFirst({
        where: eq(userTable.id, userId),
      });

      const paymentId = createId();
      const redirectUrl =
        input.redirectUrl?.trim() || `${this.config.appUrl}/payments/return`;

      await this.db.insert(payments).values({
        id: paymentId,
        userId,
        listingId: listing.id,
        purpose: PaymentPurpose.LISTING_DEPOSIT,
        channel: input.channel,
        provider: providerName,
        status: PaymentStatus.PENDING,
        amountMinor: input.amountMinor,
        currency: input.currency,
      });

      try {
        const checkout = await this.payments.createCheckout(providerName, {
          paymentId,
          userId,
          email: payer?.email,
          amountMinor: input.amountMinor,
          currency: input.currency,
          description: `Deposit for ${listing.title}`,
          redirectUrl,
        });

        await this.db
          .update(payments)
          .set({
            providerRef: checkout.providerRef,
            checkoutUrl: checkout.checkoutUrl ?? null,
            status:
              checkout.status === 'REQUIRES_ACTION'
                ? PaymentStatus.REQUIRES_ACTION
                : PaymentStatus.PENDING,
          })
          .where(eq(payments.id, paymentId));
      } catch (error) {
        await this.db
          .update(payments)
          .set({
            status: PaymentStatus.FAILED,
            failureReason:
              error instanceof Error ? error.message : String(error),
          })
          .where(eq(payments.id, paymentId));
        throw error;
      }

      return this.getMineById(paymentId, userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `create deposit failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create deposit payment', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(userId: string) {
    try {
      return await this.db.query.payments.findMany({
        where: eq(payments.userId, userId),
        orderBy: [desc(payments.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list payments', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getMineById(paymentId: string, userId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment || payment.userId !== userId) {
      throw AppException.notFound(`Payment ${paymentId} not found`);
    }
    return payment;
  }

  async handleFapshiWebhook(
    payload: Record<string, unknown>,
    webhookSecretHeader: string | undefined,
  ) {
    this.assertFapshiWebhookSecret(webhookSecretHeader);

    const transId =
      typeof payload.transId === 'string' ? payload.transId : undefined;
    const externalId =
      typeof payload.externalId === 'string' ? payload.externalId : undefined;
    const statusRaw =
      typeof payload.status === 'string' ? payload.status.toUpperCase() : '';

    if (!transId && !externalId) {
      throw AppException.badRequest(
        'Fapshi webhook missing transId/externalId',
      );
    }

    const payment = await this.findPayment({
      providerRef: transId,
      paymentId: externalId,
    });
    if (!payment) {
      this.logger.warn(
        `Fapshi webhook for unknown payment transId=${transId} externalId=${externalId}`,
      );
      return { received: true, matched: false };
    }

    // Prefer live status over trusting webhook alone (Fapshi recommendation).
    if (payment.providerRef) {
      const live = await this.payments.getStatus(
        payment.provider,
        payment.providerRef,
      );
      await this.applyProviderStatus(payment.id, live.status);
    } else {
      await this.applyProviderStatus(
        payment.id,
        this.mapFapshiStatus(statusRaw),
      );
    }

    return { received: true, matched: true, paymentId: payment.id };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!signature) {
      throw AppException.badRequest('Missing Stripe-Signature header');
    }

    const event = this.payments.constructStripeWebhookEvent(rawBody, signature);

    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.expired' &&
      event.type !== 'checkout.session.async_payment_failed'
    ) {
      return { received: true, ignored: true, type: event.type };
    }

    const session = event.data.object as {
      id?: string;
      metadata?: { paymentId?: string };
      payment_status?: string;
    };

    const payment = await this.findPayment({
      providerRef: session.id,
      paymentId: session.metadata?.paymentId,
    });
    if (!payment) {
      this.logger.warn(
        `Stripe webhook for unknown payment session=${session.id}`,
      );
      return { received: true, matched: false };
    }

    if (event.type === 'checkout.session.expired') {
      await this.applyProviderStatus(payment.id, 'EXPIRED');
    } else if (event.type === 'checkout.session.async_payment_failed') {
      await this.applyProviderStatus(payment.id, 'FAILED');
    } else if (session.payment_status === 'paid') {
      await this.applyProviderStatus(payment.id, 'SUCCEEDED');
    }

    return { received: true, matched: true, paymentId: payment.id };
  }

  /** Dev helper: mark a console payment succeeded. */
  async completeConsolePayment(paymentId: string, userId: string) {
    const payment = await this.getMineById(paymentId, userId);
    if (payment.provider !== PaymentProviderName.CONSOLE) {
      throw AppException.badRequest(
        'Only CONSOLE payments can be completed this way',
      );
    }
    await this.applyProviderStatus(payment.id, 'SUCCEEDED');
    return this.getMineById(paymentId, userId);
  }

  private async findPayment(input: {
    providerRef?: string;
    paymentId?: string;
  }) {
    if (input.paymentId) {
      const byId = await this.db.query.payments.findFirst({
        where: eq(payments.id, input.paymentId),
      });
      if (byId) {
        return byId;
      }
    }
    if (input.providerRef) {
      return this.db.query.payments.findFirst({
        where: eq(payments.providerRef, input.providerRef),
      });
    }
    return undefined;
  }

  private async applyProviderStatus(
    paymentId: string,
    status: 'PENDING' | 'REQUIRES_ACTION' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED',
  ) {
    const mapped =
      status === 'SUCCEEDED'
        ? PaymentStatus.SUCCEEDED
        : status === 'FAILED'
          ? PaymentStatus.FAILED
          : status === 'EXPIRED'
            ? PaymentStatus.EXPIRED
            : status === 'REQUIRES_ACTION'
              ? PaymentStatus.REQUIRES_ACTION
              : PaymentStatus.PENDING;

    const existing = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!existing) {
      return;
    }
    if (
      existing.status === PaymentStatus.SUCCEEDED ||
      existing.status === PaymentStatus.CANCELLED
    ) {
      return;
    }

    await this.db
      .update(payments)
      .set({
        status: mapped,
        paidAt:
          mapped === PaymentStatus.SUCCEEDED ? new Date() : existing.paidAt,
      })
      .where(eq(payments.id, paymentId));

    if (mapped === PaymentStatus.SUCCEEDED) {
      const updated = {
        ...existing,
        status: mapped,
        paidAt: existing.paidAt ?? new Date(),
      };
      await this.finalizePaymentSucceeded(updated);
    } else if (mapped === PaymentStatus.FAILED) {
      this.notifyPaymentReceipt(existing, mapped, paymentId);
    }
  }

  private async finalizePaymentSucceeded(
    payment: typeof payments.$inferSelect,
  ): Promise<void> {
    try {
      await this.escrow.holdFromPayment(payment);
    } catch (error) {
      this.logger.error(
        `escrow hold after payment success failed paymentId=${payment.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.notifyPaymentReceipt(payment, PaymentStatus.SUCCEEDED, payment.id);

    if (payment.listingId) {
      const listing = await this.listings.getById(payment.listingId);
      const amountLabel = this.formatAmountForReceipt(
        payment.amountMinor,
        payment.currency,
      );
      this.notifications.notify({
        userId: listing.ownerUserId,
        type: NotificationType.PAYMENT_SUCCEEDED,
        title: 'Deposit received',
        body: `A deposit of ${amountLabel} was paid on "${listing.title}".`,
        entityType: NotificationEntityType.PAYMENT,
        entityId: payment.id,
        resources: {
          paymentId: payment.id,
          listingId: listing.id,
          listingTitle: listing.title,
          actorUserId: payment.userId,
        },
      });
    }
  }

  private notifyPaymentReceipt(
    payment: typeof payments.$inferSelect,
    status: PaymentStatus.SUCCEEDED | PaymentStatus.FAILED,
    paymentId: string,
  ): void {
    const amountLabel = this.formatAmountForReceipt(
      payment.amountMinor,
      payment.currency,
    );
    const payerType =
      status === PaymentStatus.SUCCEEDED
        ? NotificationType.PAYMENT_SUCCEEDED
        : NotificationType.PAYMENT_FAILED;
    this.notifications.notify({
      userId: payment.userId,
      type: payerType,
      title:
        status === PaymentStatus.SUCCEEDED
          ? 'Payment receipt'
          : 'Payment failed',
      body:
        status === PaymentStatus.SUCCEEDED
          ? `Your payment of ${amountLabel} was successful.`
          : `Your payment of ${amountLabel} failed.`,
      entityType: NotificationEntityType.PAYMENT,
      entityId: paymentId,
      resources: {
        paymentId,
        listingId: payment.listingId ?? undefined,
      },
    });
  }

  private formatAmountForReceipt(
    amountMinor: number,
    currency: typeof payments.$inferSelect.currency,
  ): string {
    return `${amountMinor.toLocaleString('en-US')} ${currency}`;
  }

  private mapFapshiStatus(
    status: string,
  ): 'PENDING' | 'REQUIRES_ACTION' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' {
    switch (status) {
      case 'SUCCESSFUL':
        return 'SUCCEEDED';
      case 'FAILED':
        return 'FAILED';
      case 'EXPIRED':
        return 'EXPIRED';
      default:
        return 'PENDING';
    }
  }

  private assertFapshiWebhookSecret(header: string | undefined): void {
    const expected = this.config.fapshiWebhookSecret;
    if (!expected) {
      // Sandbox without secret configured — allow but log.
      this.logger.warn(
        'FAPSHI_WEBHOOK_SECRET not set; accepting webhook without verification',
      );
      return;
    }
    if (!header) {
      throw AppException.forbidden('Missing x-wh-secret header');
    }
    const a = createHash('sha256').update(header).digest();
    const b = createHash('sha256').update(expected).digest();
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw AppException.forbidden('Invalid Fapshi webhook secret');
    }
  }
}
