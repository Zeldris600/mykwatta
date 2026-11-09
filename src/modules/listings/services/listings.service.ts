import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import {
  amenityCatalog,
  landmarkCatalog,
  listingAmenities,
  listingLandmarks,
} from '@mykwatta/core/database/schema/catalogs.schema';
import { listingMedia } from '@mykwatta/core/database/schema/listing-media.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { listingTitleDocuments } from '@mykwatta/core/database/schema/title-documents.schema';
import { seedCatalogs } from '@mykwatta/core/database/seeder/seed-catalogs';
import {
  OrganisationRole,
  Persona,
} from '@mykwatta/modules/identity/constants';
import { IdentityService } from '@mykwatta/modules/identity/services';
import { KycService } from '@mykwatta/modules/kyc/services';
import {
  ListingMediaKind,
  ListingStatus,
  ListingType,
  ListingVerificationStatus,
  PREMIUM_MIN_FLOOR_PLANS,
  PREMIUM_MIN_PHOTOS,
} from '@mykwatta/modules/listings/constants';
import type {
  CreateListingDto,
  ListListingsQueryDto,
  UpdateListingDto,
} from '@mykwatta/modules/listings/dto';
import { buildBuyerTitleChecklist } from '@mykwatta/modules/listings/types/buyer-title-checklist';
import type { ListingTrustChecklist } from '@mykwatta/modules/listings/types/trust-checklist';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';

const LISTING_CREATOR_PERSONAS: readonly Persona[] = [
  Persona.LANDLORD,
  Persona.AGENT,
  Persona.DEVELOPER,
];

const LISTING_ORG_ROLES: readonly OrganisationRole[] = [
  OrganisationRole.OWNER,
  OrganisationRole.ADMIN,
  OrganisationRole.PROPERTY_MANAGER,
  OrganisationRole.AGENT,
];

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @InjectQueue(QueueName.SAVED_SEARCH_MATCH)
    private readonly savedSearchQueue: Queue,
    @InjectQueue(QueueName.FEED_SYNC)
    private readonly feedSyncQueue: Queue,
    private readonly identity: IdentityService,
    private readonly kyc: KycService,
  ) {}

  /** Enqueue platform feed eligibility sync (publish / verify / media / freeze). */
  enqueueFeedSync(listingId: string): void {
    void this.feedSyncQueue
      .add(QueueJobName.SYNC_FEED_POST, { listingId })
      .catch((error: unknown) => {
        this.logger.warn(
          `feed sync enqueue failed listing=${listingId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  async create(ownerUserId: string, input: CreateListingDto) {
    try {
      await this.assertCanCreateListings(ownerUserId, input.organisationId);

      const id = createId();
      await this.db.insert(listings).values({
        id,
        title: input.title.trim(),
        description: input.description.trim(),
        status: ListingStatus.DRAFT,
        listingType: input.listingType,
        propertyType: input.propertyType,
        priceMinor: input.priceMinor,
        currency: input.currency ?? CurrencyCode.XAF,
        city: input.city.trim(),
        neighborhood: input.neighborhood?.trim() || null,
        addressLine: input.addressLine?.trim() || null,
        countryCode: (input.countryCode ?? 'CM').trim().toUpperCase(),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        areaSqm: input.areaSqm ?? null,
        ownerUserId,
        organisationId: input.organisationId ?? null,
        quartierId: input.quartierId?.trim() || null,
        ...(input.titleStatus !== undefined
          ? { titleStatus: input.titleStatus }
          : {}),
      });

      if (input.amenitySlugs !== undefined) {
        await this.replaceAmenities(id, input.amenitySlugs);
      }
      if (input.landmarkSlugs !== undefined) {
        await this.replaceLandmarks(id, input.landmarkSlugs);
      }

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `create listing failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listPublished(query: ListListingsQueryDto) {
    try {
      const filters: SQL[] = [
        eq(listings.status, ListingStatus.PUBLISHED),
        isNull(listings.trustFrozenAt),
        isNull(listings.duplicateOfListingId),
      ];
      this.applySearchFilters(filters, query);

      const page = query.page;
      const limit = query.limit;
      const offset = (page - 1) * limit;

      const whereClause = and(...filters);
      const [rows, countRow] = await Promise.all([
        this.db.query.listings.findMany({
          where: whereClause,
          orderBy: [desc(listings.publishedAt), desc(listings.createdAt)],
          limit,
          offset,
        }),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(listings)
          .where(whereClause),
      ]);

      return {
        data: await this.enrichListingsWithTrustChecklist(rows),
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
      throw AppException.database('Failed to list listings', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(ownerUserId: string, query: ListListingsQueryDto) {
    try {
      const filters: SQL[] = [eq(listings.ownerUserId, ownerUserId)];
      this.applySearchFilters(filters, query);

      const page = query.page;
      const limit = query.limit;
      const offset = (page - 1) * limit;
      const whereClause = and(...filters);

      const [rows, countRow] = await Promise.all([
        this.db.query.listings.findMany({
          where: whereClause,
          orderBy: [desc(listings.updatedAt)],
          limit,
          offset,
        }),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(listings)
          .where(whereClause),
      ]);

      const links = await this.loadCatalogLinks(rows.map((row) => row.id));

      return {
        data: rows.map((row) => ({
          ...row,
          amenitySlugs: links.amenities.get(row.id) ?? [],
          landmarkSlugs: links.landmarks.get(row.id) ?? [],
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
      throw AppException.database('Failed to list my listings', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getPublicOrOwned(id: string, viewerUserId?: string) {
    const listing = await this.getById(id);

    if (listing.status === ListingStatus.PUBLISHED) {
      return listing;
    }

    if (!viewerUserId) {
      throw AppException.notFound(`Listing ${id} not found`);
    }

    await this.assertCanManageListing(listing, viewerUserId);
    return listing;
  }

  async update(id: string, userId: string, input: UpdateListingDto) {
    try {
      const listing = await this.getById(id);
      await this.assertCanManageListing(listing, userId);

      if (
        listing.status === ListingStatus.ARCHIVED ||
        listing.status === ListingStatus.UNDER_CONTRACT
      ) {
        throw AppException.badRequest(
          `${listing.status} listings cannot be edited`,
        );
      }

      await this.db
        .update(listings)
        .set({
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.listingType !== undefined
            ? { listingType: input.listingType }
            : {}),
          ...(input.propertyType !== undefined
            ? { propertyType: input.propertyType }
            : {}),
          ...(input.priceMinor !== undefined
            ? { priceMinor: input.priceMinor }
            : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.city !== undefined ? { city: input.city.trim() } : {}),
          ...(input.neighborhood !== undefined
            ? { neighborhood: input.neighborhood?.trim() || null }
            : {}),
          ...(input.addressLine !== undefined
            ? { addressLine: input.addressLine?.trim() || null }
            : {}),
          ...(input.countryCode !== undefined
            ? { countryCode: input.countryCode.trim().toUpperCase() }
            : {}),
          ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
          ...(input.longitude !== undefined
            ? { longitude: input.longitude }
            : {}),
          ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
          ...(input.bathrooms !== undefined
            ? { bathrooms: input.bathrooms }
            : {}),
          ...(input.areaSqm !== undefined ? { areaSqm: input.areaSqm } : {}),
          ...(input.quartierId !== undefined
            ? { quartierId: input.quartierId?.trim() || null }
            : {}),
          ...(input.titleStatus !== undefined
            ? { titleStatus: input.titleStatus }
            : {}),
        })
        .where(eq(listings.id, id));

      if (input.amenitySlugs !== undefined) {
        await this.replaceAmenities(id, input.amenitySlugs);
      }
      if (input.landmarkSlugs !== undefined) {
        await this.replaceLandmarks(id, input.landmarkSlugs);
      }

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async publish(id: string, userId: string) {
    try {
      const listing = await this.getById(id);
      await this.assertCanManageListing(listing, userId);
      await this.kyc.assertApproved(listing.ownerUserId);
      await this.assertHasMedia(id);

      if (listing.status === ListingStatus.PUBLISHED) {
        return listing;
      }
      if (listing.status === ListingStatus.ARCHIVED) {
        throw AppException.badRequest('Archived listings cannot be published');
      }
      if (listing.status === ListingStatus.UNDER_CONTRACT) {
        throw AppException.badRequest(
          'Listings under contract cannot be republished; cancel the deal first',
        );
      }

      await this.db
        .update(listings)
        .set({
          status: ListingStatus.PUBLISHED,
          publishedAt: new Date(),
        })
        .where(eq(listings.id, id));

      void this.savedSearchQueue
        .add(QueueJobName.MATCH_SAVED_SEARCHES, { listingId: id })
        .catch((error: unknown) => {
          this.logger.warn(
            `saved search match enqueue failed listing=${id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      this.enqueueFeedSync(id);

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to publish listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async archive(id: string, userId: string) {
    try {
      const listing = await this.getById(id);
      await this.assertCanManageListing(listing, userId);

      if (listing.status === ListingStatus.ARCHIVED) {
        return listing;
      }
      if (listing.status === ListingStatus.UNDER_CONTRACT) {
        throw AppException.badRequest(
          'Listings under contract cannot be archived; complete or cancel the deal',
        );
      }

      await this.db
        .update(listings)
        .set({ status: ListingStatus.ARCHIVED })
        .where(eq(listings.id, id));

      this.enqueueFeedSync(id);

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to archive listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getById(id: string) {
    try {
      const listing = await this.db.query.listings.findFirst({
        where: eq(listings.id, id),
      });
      if (!listing) {
        throw AppException.notFound(`Listing ${id} not found`);
      }
      const [enriched] = await this.enrichListingsWithTrustChecklist([listing]);
      if (enriched.listingType !== ListingType.SALE) {
        return enriched;
      }
      const documents = await this.db.query.listingTitleDocuments.findMany({
        where: eq(listingTitleDocuments.listingId, enriched.id),
      });
      return {
        ...enriched,
        buyerTitleChecklist: buildBuyerTitleChecklist(enriched, documents),
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to load listing', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Used by inquiries / other listing sub-resources. */
  async assertUserCanManage(listingId: string, userId: string) {
    const listing = await this.getById(listingId);
    await this.assertCanManageListing(listing, userId);
    return listing;
  }

  private async assertHasMedia(listingId: string): Promise<void> {
    const [{ value: mediaCount }] = await this.db
      .select({ value: count() })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, listingId));

    if (Number(mediaCount) < 1) {
      throw AppException.badRequest(
        'At least one listing photo is required before publishing',
      );
    }
  }

  private applySearchFilters(
    filters: SQL[],
    query: ListListingsQueryDto,
  ): void {
    if (query.city) {
      filters.push(ilike(listings.city, `%${query.city.trim()}%`));
    }
    if (query.q) {
      const term = `%${query.q.trim()}%`;
      filters.push(
        or(ilike(listings.title, term), ilike(listings.description, term))!,
      );
    }
    if (query.listingType) {
      filters.push(eq(listings.listingType, query.listingType));
    }
    if (query.propertyType) {
      filters.push(eq(listings.propertyType, query.propertyType));
    }
    if (query.minPriceMinor !== undefined) {
      filters.push(gte(listings.priceMinor, query.minPriceMinor));
    }
    if (query.maxPriceMinor !== undefined) {
      filters.push(lte(listings.priceMinor, query.maxPriceMinor));
    }
    if (query.minBedrooms !== undefined) {
      filters.push(gte(listings.bedrooms, query.minBedrooms));
    }
    if (query.quartierId) {
      filters.push(eq(listings.quartierId, query.quartierId.trim()));
    }
    if (query.amenity) {
      const slug = query.amenity.trim().toLowerCase();
      filters.push(
        sql`exists (
          select 1 from ${listingAmenities}
          inner join ${amenityCatalog}
            on ${amenityCatalog.id} = ${listingAmenities.amenityId}
          where ${listingAmenities.listingId} = ${listings.id}
            and ${amenityCatalog.slug} = ${slug}
        )`,
      );
    }

    const { north, south, east, west } = query;
    const hasBounds =
      north !== undefined ||
      south !== undefined ||
      east !== undefined ||
      west !== undefined;
    if (hasBounds) {
      if (
        north === undefined ||
        south === undefined ||
        east === undefined ||
        west === undefined
      ) {
        throw AppException.badRequest(
          'Map bounds require north, south, east, and west together',
        );
      }
      if (south > north) {
        throw AppException.badRequest('south must be <= north');
      }
      filters.push(isNotNull(listings.latitude));
      filters.push(isNotNull(listings.longitude));
      filters.push(lte(listings.latitude, north));
      filters.push(gte(listings.latitude, south));
      filters.push(lte(listings.longitude, east));
      filters.push(gte(listings.longitude, west));
    }
  }

  private async assertCanCreateListings(
    userId: string,
    organisationId?: string,
  ): Promise<void> {
    const personas = await this.identity.listPersonasForUser(userId);
    const hasPersona = LISTING_CREATOR_PERSONAS.some((persona) =>
      personas.includes(persona),
    );

    if (organisationId) {
      const membership = await this.identity.assertMembership(
        organisationId,
        userId,
      );
      if (!LISTING_ORG_ROLES.includes(membership.role)) {
        throw AppException.forbidden(
          'Your organisation role cannot create listings',
        );
      }
      return;
    }

    if (!hasPersona) {
      throw AppException.forbidden(
        'Listing creation requires LANDLORD, AGENT, or DEVELOPER persona',
      );
    }
  }

  private async assertCanManageListing(
    listing: {
      ownerUserId: string;
      organisationId: string | null;
    },
    userId: string,
  ): Promise<void> {
    if (listing.ownerUserId === userId) {
      return;
    }

    if (listing.organisationId) {
      const membership = await this.identity.assertMembership(
        listing.organisationId,
        userId,
      );
      if (LISTING_ORG_ROLES.includes(membership.role)) {
        return;
      }
    }

    throw AppException.forbidden('You cannot manage this listing');
  }

  buildTrustChecklist(
    listing: {
      verificationStatus: ListingVerificationStatus;
      trustFrozenAt: Date | null;
    },
    owner: { phoneNumberVerified: boolean | null },
    mediaCount: number,
    kycApproved: boolean,
  ): ListingTrustChecklist {
    return {
      phoneVerified: owner.phoneNumberVerified === true,
      kycVerified: kycApproved,
      listingVerified:
        listing.verificationStatus === ListingVerificationStatus.VERIFIED,
      hasPhotos: mediaCount > 0,
      trustFrozen: listing.trustFrozenAt != null,
    };
  }

  private async enrichListingsWithTrustChecklist<
    T extends typeof listings.$inferSelect,
  >(rows: T[]): Promise<Array<T & { trustChecklist: ListingTrustChecklist }>> {
    if (rows.length === 0) {
      return [];
    }

    const listingIds = rows.map((row) => row.id);
    const ownerIds = [...new Set(rows.map((row) => row.ownerUserId))];

    const [owners, mediaCounts] = await Promise.all([
      this.db.query.user.findMany({
        where: inArray(userTable.id, ownerIds),
        columns: { id: true, phoneNumberVerified: true },
      }),
      this.db
        .select({
          listingId: listingMedia.listingId,
          value: count(),
        })
        .from(listingMedia)
        .where(inArray(listingMedia.listingId, listingIds))
        .groupBy(listingMedia.listingId),
    ]);

    const ownerById = new Map(owners.map((row) => [row.id, row]));
    const mediaByListing = new Map(
      mediaCounts.map((row) => [row.listingId, Number(row.value)]),
    );

    const kycApprovedByOwner = new Map<string, boolean>();
    await Promise.all(
      ownerIds.map(async (ownerId) => {
        kycApprovedByOwner.set(ownerId, await this.kyc.isApproved(ownerId));
      }),
    );

    const links = await this.loadCatalogLinks(listingIds);

    return rows.map((listing) => {
      const owner = ownerById.get(listing.ownerUserId) ?? {
        phoneNumberVerified: false,
      };
      return {
        ...listing,
        amenitySlugs: links.amenities.get(listing.id) ?? [],
        landmarkSlugs: links.landmarks.get(listing.id) ?? [],
        trustChecklist: this.buildTrustChecklist(
          listing,
          owner,
          mediaByListing.get(listing.id) ?? 0,
          kycApprovedByOwner.get(listing.ownerUserId) ?? false,
        ),
      };
    });
  }

  async applyPremium(id: string, userId: string) {
    try {
      const listing = await this.getById(id);
      await this.assertCanManageListing(listing, userId);

      const rows = await this.db
        .select({ kind: listingMedia.kind })
        .from(listingMedia)
        .where(eq(listingMedia.listingId, id));
      const photos = rows.filter(
        (row) => row.kind === ListingMediaKind.PHOTO,
      ).length;
      const floorPlans = rows.filter(
        (row) => row.kind === ListingMediaKind.FLOOR_PLAN,
      ).length;
      if (photos < PREMIUM_MIN_PHOTOS || floorPlans < PREMIUM_MIN_FLOOR_PLANS) {
        throw AppException.badRequest(
          `Premium placement needs at least ${PREMIUM_MIN_PHOTOS} photos and ${PREMIUM_MIN_FLOOR_PLANS} floor plan`,
        );
      }

      await this.db
        .update(listings)
        .set({ isPremium: true })
        .where(eq(listings.id, id));

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to apply premium placement', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async replaceAmenities(listingId: string, slugs: string[]) {
    const ids = await this.resolveCatalogIds(amenityCatalog, slugs, 'amenity');
    await this.db
      .delete(listingAmenities)
      .where(eq(listingAmenities.listingId, listingId));
    if (ids.length === 0) {
      return;
    }
    await this.db.insert(listingAmenities).values(
      ids.map((amenityId) => ({
        listingId,
        amenityId,
      })),
    );
  }

  private async replaceLandmarks(listingId: string, slugs: string[]) {
    const ids = await this.resolveCatalogIds(
      landmarkCatalog,
      slugs,
      'landmark',
    );
    await this.db
      .delete(listingLandmarks)
      .where(eq(listingLandmarks.listingId, listingId));
    if (ids.length === 0) {
      return;
    }
    await this.db.insert(listingLandmarks).values(
      ids.map((landmarkId) => ({
        listingId,
        landmarkId,
      })),
    );
  }

  private async resolveCatalogIds(
    table: typeof amenityCatalog | typeof landmarkCatalog,
    slugs: string[],
    label: string,
  ): Promise<string[]> {
    const normalized = [
      ...new Set(
        slugs
          .map((slug) => slug.trim().toLowerCase())
          .filter((slug) => slug.length > 0),
      ),
    ];
    if (normalized.length === 0) {
      return [];
    }
    await seedCatalogs(this.db);
    const rows = await this.db
      .select({ id: table.id, slug: table.slug })
      .from(table)
      .where(inArray(table.slug, normalized));
    if (rows.length !== normalized.length) {
      const found = new Set(rows.map((row) => row.slug));
      const missing = normalized.filter((slug) => !found.has(slug));
      throw AppException.badRequest(
        `Unknown ${label} slug: ${missing.join(', ')}`,
      );
    }
    return rows.map((row) => row.id);
  }

  private async loadCatalogLinks(listingIds: string[]) {
    const [amenityRows, landmarkRows] = await Promise.all([
      this.db
        .select({
          listingId: listingAmenities.listingId,
          slug: amenityCatalog.slug,
        })
        .from(listingAmenities)
        .innerJoin(
          amenityCatalog,
          eq(amenityCatalog.id, listingAmenities.amenityId),
        )
        .where(inArray(listingAmenities.listingId, listingIds)),
      this.db
        .select({
          listingId: listingLandmarks.listingId,
          slug: landmarkCatalog.slug,
        })
        .from(listingLandmarks)
        .innerJoin(
          landmarkCatalog,
          eq(landmarkCatalog.id, listingLandmarks.landmarkId),
        )
        .where(inArray(listingLandmarks.listingId, listingIds)),
    ]);

    const amenities = new Map<string, string[]>();
    for (const row of amenityRows) {
      const bucket = amenities.get(row.listingId) ?? [];
      bucket.push(row.slug);
      amenities.set(row.listingId, bucket);
    }
    const landmarks = new Map<string, string[]>();
    for (const row of landmarkRows) {
      const bucket = landmarks.get(row.listingId) ?? [];
      bucket.push(row.slug);
      landmarks.set(row.listingId, bucket);
    }
    return { amenities, landmarks };
  }
}
