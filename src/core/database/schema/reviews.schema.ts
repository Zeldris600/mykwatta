import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { ReviewStatus } from '@mykwatta/modules/listings/constants';
import { user } from './auth.schema';
import { listings } from './listings.schema';

export const reviewStatusEnum = pgEnum(
  'review_status',
  Object.values(ReviewStatus) as [ReviewStatus, ...ReviewStatus[]],
);

export const listingReviews = pgTable(
  'listing_reviews',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment').notNull(),
    status: reviewStatusEnum('status').notNull().default(ReviewStatus.ACTIVE),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('listing_reviews_listing_author_uidx').on(
      table.listingId,
      table.authorUserId,
    ),
    index('listing_reviews_listing_idx').on(table.listingId),
    index('listing_reviews_author_idx').on(table.authorUserId),
  ],
);
