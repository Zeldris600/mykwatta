import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { listings } from './listings.schema';

/** Snapshot of public listing filters a seeker wants alerted on. */
export type SavedSearchFilters = {
  city?: string;
  q?: string;
  listingType?: string;
  propertyType?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  minBedrooms?: number;
  quartierId?: string;
  amenity?: string;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    filters: jsonb('filters').$type<SavedSearchFilters>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('saved_searches_user_idx').on(table.userId)],
);

export const savedSearchMatches = pgTable(
  'saved_search_matches',
  {
    id: text('id').primaryKey(),
    savedSearchId: text('saved_search_id')
      .notNull()
      .references(() => savedSearches.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('saved_search_matches_search_listing_uidx').on(
      table.savedSearchId,
      table.listingId,
    ),
    index('saved_search_matches_listing_idx').on(table.listingId),
    index('saved_search_matches_created_idx').on(table.createdAt),
  ],
);
