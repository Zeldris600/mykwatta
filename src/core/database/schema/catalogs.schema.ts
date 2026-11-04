import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { listings } from './listings.schema';

export const amenityCatalog = pgTable(
  'amenity_catalog',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    nameEn: text('name_en').notNull(),
    nameFr: text('name_fr').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('amenity_catalog_slug_uidx').on(table.slug)],
);

export const landmarkCatalog = pgTable(
  'landmark_catalog',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    nameEn: text('name_en').notNull(),
    nameFr: text('name_fr').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('landmark_catalog_slug_uidx').on(table.slug)],
);

export const listingAmenities = pgTable(
  'listing_amenities',
  {
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    amenityId: text('amenity_id')
      .notNull()
      .references(() => amenityCatalog.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.amenityId] }),
    index('listing_amenities_amenity_idx').on(table.amenityId),
  ],
);

export const listingLandmarks = pgTable(
  'listing_landmarks',
  {
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    landmarkId: text('landmark_id')
      .notNull()
      .references(() => landmarkCatalog.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.landmarkId] }),
    index('listing_landmarks_landmark_idx').on(table.landmarkId),
  ],
);
