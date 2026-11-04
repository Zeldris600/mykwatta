import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { listings } from './listings.schema';

export const savedListings = pgTable(
  'saved_listings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('saved_listings_user_listing_uidx').on(
      table.userId,
      table.listingId,
    ),
    index('saved_listings_user_idx').on(table.userId),
    index('saved_listings_listing_idx').on(table.listingId),
  ],
);
