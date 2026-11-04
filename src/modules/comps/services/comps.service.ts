import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingDeals } from '@mykwatta/core/database/schema/deals.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { percentile } from '@mykwatta/modules/comps/utils/percentiles.util';
import type { CompsQueryDto } from '@mykwatta/modules/comps/dto';
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';
import {
  ListingType,
  ListingVerificationStatus,
} from '@mykwatta/modules/listings/constants';

const MIN_SAMPLE_SIZE = 5;

export type CompsQueryResult =
  | {
      sufficient: true;
      sampleSize: number;
      p25Minor: number;
      p50Minor: number;
      p75Minor: number;
      currency: string;
    }
  | {
      sufficient: false;
      sampleSize: number;
      reason: 'INSUFFICIENT_DATA';
    };

@Injectable()
export class CompsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async query(filters: CompsQueryDto): Promise<CompsQueryResult> {
    try {
      const listingFilters = [
        eq(listings.listingType, ListingType.RENT),
        eq(listings.verificationStatus, ListingVerificationStatus.VERIFIED),
      ];
      if (filters.city?.trim()) {
        listingFilters.push(
          sql`lower(${listings.city}) = lower(${filters.city.trim()})`,
        );
      }
      if (filters.propertyType) {
        listingFilters.push(eq(listings.propertyType, filters.propertyType));
      }
      if (filters.bedrooms !== undefined) {
        listingFilters.push(eq(listings.bedrooms, filters.bedrooms));
      }
      if (filters.quartierId?.trim()) {
        listingFilters.push(eq(listings.quartierId, filters.quartierId.trim()));
      }

      const verifiedRows = await this.db
        .select({ amountMinor: listings.priceMinor, currency: listings.currency })
        .from(listings)
        .where(and(...listingFilters));

      const dealFilters = [
        eq(listingDeals.type, DealType.LEASE),
        eq(listingDeals.status, DealStatus.COMPLETED),
      ];
      if (filters.city?.trim()) {
        dealFilters.push(
          sql`lower(${listings.city}) = lower(${filters.city.trim()})`,
        );
      }
      if (filters.propertyType) {
        dealFilters.push(eq(listings.propertyType, filters.propertyType));
      }
      if (filters.bedrooms !== undefined) {
        dealFilters.push(eq(listings.bedrooms, filters.bedrooms));
      }
      if (filters.quartierId?.trim()) {
        dealFilters.push(eq(listings.quartierId, filters.quartierId.trim()));
      }

      const dealRows = await this.db
        .select({
          amountMinor: listingDeals.amountMinor,
          currency: listingDeals.currency,
        })
        .from(listingDeals)
        .innerJoin(listings, eq(listingDeals.listingId, listings.id))
        .where(and(...dealFilters));

      const samples = [
        ...verifiedRows.map((row) => row.amountMinor),
        ...dealRows.map((row) => row.amountMinor),
      ].filter((value) => Number.isFinite(value) && value > 0);

      const sampleSize = samples.length;
      if (sampleSize < MIN_SAMPLE_SIZE) {
        return {
          sufficient: false,
          sampleSize,
          reason: 'INSUFFICIENT_DATA',
        };
      }

      const sorted = [...samples].sort((a, b) => a - b);
      const currency =
        verifiedRows[0]?.currency ?? dealRows[0]?.currency ?? 'XAF';

      return {
        sufficient: true,
        sampleSize,
        p25Minor: Math.round(percentile(sorted, 0.25)),
        p50Minor: Math.round(percentile(sorted, 0.5)),
        p75Minor: Math.round(percentile(sorted, 0.75)),
        currency,
      };
    } catch (error) {
      throw AppException.database('Failed to compute comps', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
