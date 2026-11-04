import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import {
  ListingStatus,
  ListingType,
  ListingVerificationStatus,
  PropertyType,
  TitleStatus,
} from '@mykwatta/modules/listings/constants';
import { user } from './auth.schema';
import { geoQuartiers } from './geo.schema';
import { organisations } from './identity.schema';

export const listingStatusEnum = pgEnum(
  'listing_status',
  Object.values(ListingStatus) as [ListingStatus, ...ListingStatus[]],
);

export const listingTypeEnum = pgEnum(
  'listing_type',
  Object.values(ListingType) as [ListingType, ...ListingType[]],
);

export const propertyTypeEnum = pgEnum(
  'property_type',
  Object.values(PropertyType) as [PropertyType, ...PropertyType[]],
);

export const currencyCodeEnum = pgEnum(
  'currency_code',
  Object.values(CurrencyCode) as [CurrencyCode, ...CurrencyCode[]],
);

export const listingVerificationStatusEnum = pgEnum(
  'listing_verification_status',
  Object.values(ListingVerificationStatus) as [
    ListingVerificationStatus,
    ...ListingVerificationStatus[],
  ],
);

export const listingTitleStatusEnum = pgEnum(
  'listing_title_status',
  Object.values(TitleStatus) as [TitleStatus, ...TitleStatus[]],
);

export const listings = pgTable(
  'listings',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: listingStatusEnum('status').notNull().default(ListingStatus.DRAFT),
    listingType: listingTypeEnum('listing_type').notNull(),
    propertyType: propertyTypeEnum('property_type').notNull(),
    priceMinor: integer('price_minor').notNull(),
    currency: currencyCodeEnum('currency').notNull().default(CurrencyCode.XAF),
    city: text('city').notNull(),
    neighborhood: text('neighborhood'),
    addressLine: text('address_line'),
    countryCode: text('country_code').notNull().default('CM'),
    /** WGS84 — optional until geocoded; required for map-bounds discovery. */
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    areaSqm: integer('area_sqm'),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organisationId: text('organisation_id').references(() => organisations.id, {
      onDelete: 'set null',
    }),
    verificationStatus: listingVerificationStatusEnum('verification_status')
      .notNull()
      .default(ListingVerificationStatus.UNVERIFIED),
    /** Platform admin confirmed title/deed documents (Cameroon retention). */
    documentsVerifiedByMykwatta: boolean('documents_verified_by_mykwatta')
      .notNull()
      .default(false),
    titleStatus: listingTitleStatusEnum('title_status')
      .notNull()
      .default(TitleStatus.UNKNOWN),
    isPremium: boolean('is_premium').notNull().default(false),
    trustFrozenAt: timestamp('trust_frozen_at'),
    trustFrozenReason: text('trust_frozen_reason'),
    duplicateOfListingId: text('duplicate_of_listing_id').references(
      (): AnyPgColumn => listings.id,
      { onDelete: 'set null' },
    ),
    quartierId: text('quartier_id').references(() => geoQuartiers.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listings_status_idx').on(table.status),
    index('listings_city_idx').on(table.city),
    index('listings_owner_idx').on(table.ownerUserId),
    index('listings_org_idx').on(table.organisationId),
    index('listings_type_idx').on(table.listingType),
    index('listings_price_idx').on(table.priceMinor),
    index('listings_geo_idx').on(table.latitude, table.longitude),
    index('listings_verification_status_idx').on(table.verificationStatus),
    index('listings_quartier_idx').on(table.quartierId),
    index('listings_duplicate_of_idx').on(table.duplicateOfListingId),
    index('listings_title_status_idx').on(table.titleStatus),
    index('listings_is_premium_idx').on(table.isPremium),
  ],
);
