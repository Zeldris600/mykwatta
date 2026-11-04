import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { payments } from '@mykwatta/core/database/schema/payments.schema';
import { ListingStatus } from '@mykwatta/modules/listings/constants';
import {
  DepositAvailabilityReason,
  DepositAvailabilityStatus,
  PaymentPurpose,
  PaymentStatus,
} from '@mykwatta/modules/payments/constants';
import type { DepositAvailability } from '@mykwatta/modules/payments/types/deposit-availability';

const OPEN_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.REQUIRES_ACTION,
];

type ListingDepositFields = {
  id: string;
  status: ListingStatus;
  ownerUserId: string;
  priceMinor: number;
  currency: CurrencyCode;
};

@Injectable()
export class DepositAvailabilityService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Required listing deposit = listing price (same basis as quoteDeposit).
   * A SUCCEEDED deposit counts as complete when amountMinor >= this value.
   */
  requiredDepositMinor(listing: ListingDepositFields): number {
    return listing.priceMinor;
  }

  async resolve(
    listing: ListingDepositFields,
    viewerUserId?: string | null,
  ): Promise<DepositAvailability> {
    const requiredAmountMinor = this.requiredDepositMinor(listing);
    const currency = listing.currency;

    if (listing.status === ListingStatus.UNDER_CONTRACT) {
      return this.unavailable(
        DepositAvailabilityReason.UNDER_CONTRACT,
        'This listing is under contract and is no longer accepting deposits.',
        requiredAmountMinor,
        currency,
      );
    }
    if (listing.status === ListingStatus.ARCHIVED) {
      return this.unavailable(
        DepositAvailabilityReason.ARCHIVED,
        'This listing is archived and is no longer accepting deposits.',
        requiredAmountMinor,
        currency,
      );
    }
    if (listing.status !== ListingStatus.PUBLISHED) {
      return this.unavailable(
        DepositAvailabilityReason.DRAFT,
        'This listing is not published yet.',
        requiredAmountMinor,
        currency,
      );
    }

    if (viewerUserId && listing.ownerUserId === viewerUserId) {
      return {
        status: DepositAvailabilityStatus.UNAVAILABLE,
        reason: DepositAvailabilityReason.OWN_LISTING,
        message: 'You cannot pay a deposit on your own listing.',
        requiredAmountMinor,
        currency,
        paymentId: null,
        canStartCheckout: false,
      };
    }

    if (!viewerUserId) {
      return {
        status: DepositAvailabilityStatus.AVAILABLE,
        reason: null,
        message: 'Deposit checkout is available after sign-in.',
        requiredAmountMinor,
        currency,
        paymentId: null,
        canStartCheckout: false,
      };
    }

    const succeeded = await this.findSucceededFullDeposit(
      viewerUserId,
      listing.id,
      requiredAmountMinor,
    );
    if (succeeded) {
      return {
        status: DepositAvailabilityStatus.PAID,
        reason: DepositAvailabilityReason.ALREADY_PAID,
        message:
          'You already paid the full deposit for this listing. Continue to application.',
        requiredAmountMinor,
        currency,
        paymentId: succeeded.id,
        canStartCheckout: false,
      };
    }

    const open = await this.findOpenDeposit(viewerUserId, listing.id);
    if (open) {
      return {
        status: DepositAvailabilityStatus.OPEN_CHECKOUT,
        reason: DepositAvailabilityReason.OPEN_CHECKOUT,
        message: 'Finish your open checkout to complete the deposit.',
        requiredAmountMinor,
        currency,
        paymentId: open.id,
        canStartCheckout: false,
      };
    }

    return {
      status: DepositAvailabilityStatus.AVAILABLE,
      reason: null,
      message: 'Deposit checkout is available.',
      requiredAmountMinor,
      currency,
      paymentId: null,
      canStartCheckout: true,
    };
  }

  async attachToListings<T extends ListingDepositFields>(
    rows: T[],
    viewerUserId?: string | null,
  ): Promise<Array<T & { depositAvailability: DepositAvailability }>> {
    if (rows.length === 0) {
      return [];
    }
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        depositAvailability: await this.resolve(row, viewerUserId),
      })),
    );
  }

  async findSucceededFullDeposit(
    userId: string,
    listingId: string,
    requiredAmountMinor: number,
  ) {
    const rows = await this.db.query.payments.findMany({
      where: and(
        eq(payments.userId, userId),
        eq(payments.listingId, listingId),
        eq(payments.purpose, PaymentPurpose.LISTING_DEPOSIT),
        eq(payments.status, PaymentStatus.SUCCEEDED),
      ),
      orderBy: [desc(payments.paidAt), desc(payments.createdAt)],
    });
    return rows.find((row) => row.amountMinor >= requiredAmountMinor) ?? null;
  }

  async findOpenDeposit(userId: string, listingId: string) {
    return this.db.query.payments.findFirst({
      where: and(
        eq(payments.userId, userId),
        eq(payments.listingId, listingId),
        eq(payments.purpose, PaymentPurpose.LISTING_DEPOSIT),
        inArray(payments.status, OPEN_STATUSES),
      ),
      orderBy: [desc(payments.createdAt)],
    });
  }

  private unavailable(
    reason: DepositAvailabilityReason,
    message: string,
    requiredAmountMinor: number,
    currency: CurrencyCode,
  ): DepositAvailability {
    return {
      status: DepositAvailabilityStatus.UNAVAILABLE,
      reason,
      message,
      requiredAmountMinor,
      currency,
      paymentId: null,
      canStartCheckout: false,
    };
  }
}
