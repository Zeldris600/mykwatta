import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import {
  amenityCatalog,
  listingAmenities,
} from '@mykwatta/core/database/schema/catalogs.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  savedSearchMatches,
  savedSearches,
  type SavedSearchFilters,
} from '@mykwatta/core/database/schema/saved-searches.schema';
import { ListingStatus } from '@mykwatta/modules/listings/constants';
import type {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from '@mykwatta/modules/saved-searches/dto';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

type MatchableListing = typeof listings.$inferSelect;

@Injectable()
export class SavedSearchesService {
  private readonly logger = new Logger(SavedSearchesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, input: CreateSavedSearchDto) {
    try {
      const id = createId();
      await this.db.insert(savedSearches).values({
        id,
        userId,
        name: input.name.trim(),
        filters: this.normalizeFilters(input.filters),
      });
      return this.requireOwned(id, userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to save search', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(userId: string) {
    return this.db.query.savedSearches.findMany({
      where: eq(savedSearches.userId, userId),
      orderBy: [desc(savedSearches.updatedAt)],
    });
  }

  async getMine(id: string, userId: string) {
    return this.requireOwned(id, userId);
  }

  async update(id: string, userId: string, input: UpdateSavedSearchDto) {
    await this.requireOwned(id, userId);
    try {
      await this.db
        .update(savedSearches)
        .set({
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.filters !== undefined
            ? { filters: this.normalizeFilters(input.filters) }
            : {}),
        })
        .where(eq(savedSearches.id, id));
      return this.requireOwned(id, userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update saved search', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async remove(id: string, userId: string) {
    await this.requireOwned(id, userId);
    await this.db.delete(savedSearches).where(eq(savedSearches.id, id));
    return { deleted: true, id };
  }

  async listMatches(id: string, userId: string) {
    await this.requireOwned(id, userId);
    return this.db.query.savedSearchMatches.findMany({
      where: eq(savedSearchMatches.savedSearchId, id),
      orderBy: [desc(savedSearchMatches.createdAt)],
    });
  }

  /**
   * Called when a listing is published. Inserts a match row once per saved
   * search and notifies the seeker.
   */
  async matchPublishedListing(listingId: string): Promise<number> {
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });
    if (
      !listing ||
      listing.status !== ListingStatus.PUBLISHED ||
      listing.trustFrozenAt != null ||
      listing.duplicateOfListingId != null
    ) {
      return 0;
    }

    const amenitySlugs = await this.amenitySlugsForListing(listing.id);
    const searches = await this.db.select().from(savedSearches);
    let created = 0;

    for (const search of searches) {
      if (search.userId === listing.ownerUserId) {
        continue;
      }
      if (!listingMatchesSavedSearch(listing, search.filters ?? {}, amenitySlugs)) {
        continue;
      }

      const inserted = await this.db
        .insert(savedSearchMatches)
        .values({
          id: createId(),
          savedSearchId: search.id,
          listingId: listing.id,
          notifiedAt: new Date(),
        })
        .onConflictDoNothing({
          target: [savedSearchMatches.savedSearchId, savedSearchMatches.listingId],
        })
        .returning({ id: savedSearchMatches.id });

      if (inserted.length === 0) {
        continue;
      }

      created += 1;
      this.notifications.notify({
        userId: search.userId,
        type: NotificationType.SAVED_SEARCH_MATCH,
        title: 'New listing matches your search',
        body: `"${listing.title}" in ${listing.city} matches "${search.name}".`,
        entityType: NotificationEntityType.LISTING,
        entityId: listing.id,
        resources: {
          listingId: listing.id,
          listingTitle: listing.title,
        },
      });
    }

    if (created > 0) {
      this.logger.log(
        `Saved-search matches created=${created} listing=${listing.id}`,
      );
    }
    return created;
  }

  async countForUser(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId));
    return Number(row?.value ?? 0);
  }

  async countNewMatchesForUser(userId: string, since: Date): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(savedSearchMatches)
      .innerJoin(
        savedSearches,
        eq(savedSearchMatches.savedSearchId, savedSearches.id),
      )
      .where(
        and(eq(savedSearches.userId, userId), gte(savedSearchMatches.createdAt, since)),
      );
    return Number(row?.value ?? 0);
  }

  private async amenitySlugsForListing(listingId: string): Promise<string[]> {
    const rows = await this.db
      .select({ slug: amenityCatalog.slug })
      .from(listingAmenities)
      .innerJoin(amenityCatalog, eq(amenityCatalog.id, listingAmenities.amenityId))
      .where(eq(listingAmenities.listingId, listingId));
    return rows.map((row) => row.slug);
  }

  private async requireOwned(id: string, userId: string) {
    const row = await this.db.query.savedSearches.findFirst({
      where: eq(savedSearches.id, id),
    });
    if (!row || row.userId !== userId) {
      throw AppException.notFound('Saved search not found');
    }
    return row;
  }

  private normalizeFilters(filters: SavedSearchFilters): SavedSearchFilters {
    return {
      ...filters,
      city: filters.city?.trim() || undefined,
      q: filters.q?.trim() || undefined,
      amenity: filters.amenity?.trim().toLowerCase() || undefined,
      quartierId: filters.quartierId?.trim() || undefined,
    };
  }
}

export function listingMatchesSavedSearch(
  listing: MatchableListing,
  filters: SavedSearchFilters,
  amenitySlugs: readonly string[],
): boolean {
  if (filters.city) {
    const city = filters.city.trim().toLowerCase();
    if (!listing.city.toLowerCase().includes(city)) {
      return false;
    }
  }
  if (filters.q) {
    const term = filters.q.trim().toLowerCase();
    const haystack = `${listing.title} ${listing.description}`.toLowerCase();
    if (!haystack.includes(term)) {
      return false;
    }
  }
  if (filters.listingType && listing.listingType !== filters.listingType) {
    return false;
  }
  if (filters.propertyType && listing.propertyType !== filters.propertyType) {
    return false;
  }
  if (
    filters.minPriceMinor != null &&
    listing.priceMinor < filters.minPriceMinor
  ) {
    return false;
  }
  if (
    filters.maxPriceMinor != null &&
    listing.priceMinor > filters.maxPriceMinor
  ) {
    return false;
  }
  if (
    filters.minBedrooms != null &&
    (listing.bedrooms ?? -1) < filters.minBedrooms
  ) {
    return false;
  }
  if (filters.quartierId && listing.quartierId !== filters.quartierId) {
    return false;
  }
  if (filters.amenity) {
    const slug = filters.amenity.trim().toLowerCase();
    if (!amenitySlugs.includes(slug)) {
      return false;
    }
  }
  const hasBounds =
    filters.north != null ||
    filters.south != null ||
    filters.east != null ||
    filters.west != null;
  if (hasBounds) {
    if (
      filters.north == null ||
      filters.south == null ||
      filters.east == null ||
      filters.west == null ||
      listing.latitude == null ||
      listing.longitude == null
    ) {
      return false;
    }
    if (listing.latitude > filters.north || listing.latitude < filters.south) {
      return false;
    }
    if (listing.longitude > filters.east || listing.longitude < filters.west) {
      return false;
    }
  }
  return true;
}
