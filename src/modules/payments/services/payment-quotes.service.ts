import { Injectable } from '@nestjs/common';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { ListingStatus } from '@mykwatta/modules/listings/constants';
import { ListingsService } from '@mykwatta/modules/listings/services';
import {
  APPLICATION_FEE_AMOUNT_MINOR,
  DOCS_VERIFICATION_FEE_AMOUNT_MINOR,
  PaymentPurpose,
  VENDOR_LEAD_FEE_AMOUNT_MINOR,
  VIEWING_FEE_AMOUNT_MINOR,
} from '@mykwatta/modules/payments/constants';
import { RentSchedulesService } from '@mykwatta/modules/rent-schedules/services';

export type PaymentQuoteLineItem = {
  label: string;
  amountMinor: number;
};

export type PaymentQuote = {
  purpose: PaymentPurpose;
  lineItems: PaymentQuoteLineItem[];
  totalMinor: number;
  currency: CurrencyCode;
};

@Injectable()
export class PaymentQuotesService {
  constructor(
    private readonly listings: ListingsService,
    private readonly rentSchedules: RentSchedulesService,
  ) {}

  async quoteDeposit(listingId: string): Promise<PaymentQuote> {
    const listing = await this.assertPublishedListing(listingId);
    const depositMinor = listing.priceMinor;
    const lineItems: PaymentQuoteLineItem[] = [
      { label: 'Listing deposit', amountMinor: depositMinor },
    ];
    return this.buildQuote(
      PaymentPurpose.LISTING_DEPOSIT,
      lineItems,
      listing.currency,
    );
  }

  async quoteViewingFee(listingId: string): Promise<PaymentQuote> {
    const listing = await this.assertPublishedListing(listingId);
    const lineItems: PaymentQuoteLineItem[] = [
      { label: 'Property viewing fee', amountMinor: VIEWING_FEE_AMOUNT_MINOR },
    ];
    return this.buildQuote(
      PaymentPurpose.VIEWING_FEE,
      lineItems,
      listing.currency,
    );
  }

  async quoteDocsVerification(listingId: string): Promise<PaymentQuote> {
    const listing = await this.listings.getById(listingId);
    return this.buildQuote(
      PaymentPurpose.DOCS_VERIFICATION,
      [
        {
          label: 'Document verification',
          amountMinor: DOCS_VERIFICATION_FEE_AMOUNT_MINOR,
        },
      ],
      listing.currency,
    );
  }

  async quoteVendorLeadFee(): Promise<PaymentQuote> {
    return this.buildQuote(
      PaymentPurpose.VENDOR_LEAD_FEE,
      [{ label: 'Vendor introduction fee', amountMinor: VENDOR_LEAD_FEE_AMOUNT_MINOR }],
      CurrencyCode.XAF,
    );
  }

  async quoteRentPayment(scheduleItemId: string, userId: string): Promise<PaymentQuote> {
    const schedule = await this.rentSchedules.getScheduleItemForTenant(
      scheduleItemId,
      userId,
    );
    return this.buildQuote(
      PaymentPurpose.RENT_PAYMENT,
      [{ label: 'Monthly rent', amountMinor: schedule.amountMinor }],
      schedule.currency,
    );
  }

  async quoteApplicationFee(listingId: string): Promise<PaymentQuote> {
    const listing = await this.assertPublishedListing(listingId);
    const lineItems: PaymentQuoteLineItem[] = [
      {
        label: 'Application processing fee',
        amountMinor: APPLICATION_FEE_AMOUNT_MINOR,
      },
    ];
    return this.buildQuote(
      PaymentPurpose.APPLICATION_FEE,
      lineItems,
      listing.currency,
    );
  }

  private async assertPublishedListing(listingId: string) {
    const listing = await this.listings.getById(listingId);
    if (listing.status !== ListingStatus.PUBLISHED) {
      throw AppException.notFound(`Listing ${listingId} not found`);
    }
    return listing;
  }

  private buildQuote(
    purpose: PaymentPurpose,
    lineItems: PaymentQuoteLineItem[],
    currency: CurrencyCode,
  ): PaymentQuote {
    const totalMinor = lineItems.reduce(
      (sum, item) => sum + item.amountMinor,
      0,
    );
    return { purpose, lineItems, totalMinor, currency };
  }
}
