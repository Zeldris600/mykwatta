import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { savedListings } from '@mykwatta/core/database/schema/saved-listings.schema';
import { IdentityService } from '@mykwatta/modules/identity/services';
import {
  ListingStatus,
  SAVED_LISTING_PERSONAS,
} from '@mykwatta/modules/listings/constants';
import type { ListListingsQueryDto } from '@mykwatta/modules/listings/dto';
import { ListingMediaService } from '@mykwatta/modules/listings/services/listing-media.service';

@Injectable()
export class SavedListingsService {
  private readonly logger = new Logger(SavedListingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identity: IdentityService,
    private readonly media: ListingMediaService,
  ) {}

  async save(listingId: string, userId: string) {
    try {
      await this.assertCanSave(userId);

      const listing = await this.db.query.listings.findFirst({
        where: eq(listings.id, listingId),
      });
      if (!listing || listing.status !== ListingStatus.PUBLISHED) {
        throw AppException.notFound(`Listing ${listingId} not found`);
      }
      if (listing.ownerUserId === userId) {
        throw AppException.badRequest('You cannot save your own listing');
      }

      const existing = await this.db.query.savedListings.findFirst({
        where: and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      });
      if (existing) {
        return { saved: true, listingId, savedAt: existing.createdAt };
      }

      const id = createId();
      const createdAt = new Date();
      await this.db.insert(savedListings).values({
        id,
        userId,
        listingId,
        createdAt,
      });

      return { saved: true, listingId, savedAt: createdAt };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `save listing failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to save listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async unsave(listingId: string, userId: string) {
    try {
      await this.assertCanSave(userId);

      await this.db
        .delete(savedListings)
        .where(
          and(
            eq(savedListings.userId, userId),
            eq(savedListings.listingId, listingId),
          ),
        );

      return { saved: false, listingId };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to unsave listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(userId: string, query: ListListingsQueryDto) {
    try {
      await this.assertCanSave(userId);

      const page = query.page;
      const limit = query.limit;
      const offset = (page - 1) * limit;

      const whereClause = and(
        eq(savedListings.userId, userId),
        eq(listings.status, ListingStatus.PUBLISHED),
        ...(query.city ? [eq(listings.city, query.city.trim())] : []),
        ...(query.listingType
          ? [eq(listings.listingType, query.listingType)]
          : []),
        ...(query.propertyType
          ? [eq(listings.propertyType, query.propertyType)]
          : []),
      );

      const [rows, countRow] = await Promise.all([
        this.db
          .select({
            listing: listings,
            savedAt: savedListings.createdAt,
          })
          .from(savedListings)
          .innerJoin(listings, eq(savedListings.listingId, listings.id))
          .where(whereClause)
          .orderBy(desc(savedListings.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(savedListings)
          .innerJoin(listings, eq(savedListings.listingId, listings.id))
          .where(whereClause),
      ]);

      const withMedia = await this.media.attachMediaToListings(
        rows.map((row) => row.listing),
      );

      return {
        data: withMedia.map((listing, index) => ({
          ...listing,
          saved: true,
          savedAt: rows[index].savedAt,
        })),
        meta: {
          page,
          limit,
          total: countRow[0]?.count ?? 0,
        },
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list saved listings', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async attachSavedFlag<T extends { id: string }>(
    rows: T[],
    userId?: string,
  ): Promise<Array<T & { saved: boolean }>> {
    if (rows.length === 0) {
      return [];
    }
    if (!userId) {
      return rows.map((row) => ({ ...row, saved: false }));
    }

    const listingIds = rows.map((row) => row.id);
    const savedRows = await this.db
      .select({ listingId: savedListings.listingId })
      .from(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          inArray(savedListings.listingId, listingIds),
        ),
      );

    const savedIds = new Set(savedRows.map((row) => row.listingId));
    return rows.map((row) => ({
      ...row,
      saved: savedIds.has(row.id),
    }));
  }

  private async assertCanSave(userId: string): Promise<void> {
    const personas = await this.identity.listPersonasForUser(userId);
    const allowed = SAVED_LISTING_PERSONAS.some((persona) =>
      personas.includes(persona),
    );
    if (!allowed) {
      throw AppException.forbidden(
        'Saving listings requires RENTER or BUYER persona',
      );
    }
  }
}
