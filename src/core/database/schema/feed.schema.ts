import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  FeedCommentStatus,
  FeedPostStatus,
} from '@mykwatta/modules/feed/constants';
import { user } from './auth.schema';
import { listingMedia } from './listing-media.schema';
import { listings } from './listings.schema';

export const feedPostStatusEnum = pgEnum(
  'feed_post_status',
  Object.values(FeedPostStatus) as [FeedPostStatus, ...FeedPostStatus[]],
);

export const feedCommentStatusEnum = pgEnum(
  'feed_comment_status',
  Object.values(FeedCommentStatus) as [
    FeedCommentStatus,
    ...FeedCommentStatus[],
  ],
);

export const feedPosts = pgTable(
  'feed_posts',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    /** Null when the feed post is photo-only (no listing VIDEO). */
    videoMediaId: text('video_media_id').references(() => listingMedia.id, {
      onDelete: 'restrict',
    }),
    status: feedPostStatusEnum('status')
      .notNull()
      .default(FeedPostStatus.ACTIVE),
    publishedAt: timestamp('published_at').notNull(),
    likeCount: integer('like_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    shareCount: integer('share_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('feed_posts_listing_uidx').on(table.listingId),
    index('feed_posts_status_published_idx').on(
      table.status,
      table.publishedAt,
      table.id,
    ),
  ],
);

export const feedLikes = pgTable(
  'feed_likes',
  {
    id: text('id').primaryKey(),
    feedPostId: text('feed_post_id')
      .notNull()
      .references(() => feedPosts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('feed_likes_post_user_uidx').on(table.feedPostId, table.userId),
    index('feed_likes_user_idx').on(table.userId),
  ],
);

export const feedComments = pgTable(
  'feed_comments',
  {
    id: text('id').primaryKey(),
    feedPostId: text('feed_post_id')
      .notNull()
      .references(() => feedPosts.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Self-FK enforced in SQL migration (`feed_comments_parent_comment_id_…`). */
    parentCommentId: text('parent_comment_id'),
    body: text('body').notNull(),
    status: feedCommentStatusEnum('status')
      .notNull()
      .default(FeedCommentStatus.ACTIVE),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('feed_comments_post_created_idx').on(
      table.feedPostId,
      table.createdAt,
    ),
    index('feed_comments_parent_created_idx').on(
      table.parentCommentId,
      table.createdAt,
    ),
    index('feed_comments_author_idx').on(table.authorUserId),
  ],
);

export const feedCommentLikes = pgTable(
  'feed_comment_likes',
  {
    id: text('id').primaryKey(),
    commentId: text('comment_id')
      .notNull()
      .references(() => feedComments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('feed_comment_likes_comment_user_uidx').on(
      table.commentId,
      table.userId,
    ),
    index('feed_comment_likes_user_idx').on(table.userId),
  ],
);

export const feedShares = pgTable(
  'feed_shares',
  {
    id: text('id').primaryKey(),
    feedPostId: text('feed_post_id')
      .notNull()
      .references(() => feedPosts.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('feed_shares_post_idx').on(table.feedPostId),
    index('feed_shares_user_idx').on(table.userId),
  ],
);
