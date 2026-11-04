import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ListingMediaKind } from '@mykwatta/modules/listings/constants/listing-media-kind';
import { listings } from './listings.schema';

export const listingMediaKindEnum = pgEnum(
  'listing_media_kind',
  Object.values(ListingMediaKind) as [
    ListingMediaKind,
    ...ListingMediaKind[],
  ],
);

export const listingMedia = pgTable(
  'listing_media',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    kind: listingMediaKindEnum('kind')
      .notNull()
      .default(ListingMediaKind.PHOTO),
    qualityScore: integer('quality_score'),
    caption: text('caption'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('listing_media_object_key_uidx').on(table.objectKey),
    index('listing_media_listing_idx').on(table.listingId),
    index('listing_media_listing_sort_idx').on(
      table.listingId,
      table.sortOrder,
    ),
  ],
);

export const listingMediaRelations = relations(listingMedia, ({ one }) => ({
  listing: one(listings, {
    fields: [listingMedia.listingId],
    references: [listings.id],
  }),
}));

export const listingsRelations = relations(listings, ({ many }) => ({
  media: many(listingMedia),
}));
