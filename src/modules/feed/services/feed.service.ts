import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import {
  feedCommentLikes,
  feedComments,
  feedLikes,
  feedPosts,
  feedShares,
} from '@mykwatta/core/database/schema/feed.schema';
import { organisations } from '@mykwatta/core/database/schema/identity.schema';
import { listingMedia } from '@mykwatta/core/database/schema/listing-media.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { savedListings } from '@mykwatta/core/database/schema/saved-listings.schema';
import {
  FeedCommentStatus,
  FeedPostStatus,
} from '@mykwatta/modules/feed/constants';
import type {
  CreateFeedCommentDto,
  ListFeedCommentsQueryDto,
  ListFeedQueryDto,
} from '@mykwatta/modules/feed/dto';
import { IdentityService } from '@mykwatta/modules/identity/services';
import {
  LISTING_MEDIA_SIGNED_URL_TTL_SECONDS,
  ListingMediaKind,
  ListingVerificationStatus,
} from '@mykwatta/modules/listings/constants';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';
import { StorageBucket, StorageService } from '@mykwatta/shared/storage';

type FeedPostRow = typeof feedPosts.$inferSelect;

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly config: ApiConfigService,
    private readonly identity: IdentityService,
    private readonly notifications: NotificationsService,
  ) {}

  async listFeed(query: ListFeedQueryDto, viewerUserId?: string) {
    const limit = query.limit;
    const cursor = this.parseCursor(query.cursor);

    const filters = [eq(feedPosts.status, FeedPostStatus.ACTIVE)];
    if (cursor) {
      filters.push(
        or(
          lt(feedPosts.publishedAt, cursor.publishedAt),
          and(
            eq(feedPosts.publishedAt, cursor.publishedAt),
            lt(feedPosts.id, cursor.id),
          ),
        )!,
      );
    }

    const rows = await this.db.query.feedPosts.findMany({
      where: and(...filters),
      orderBy: [desc(feedPosts.publishedAt), desc(feedPosts.id)],
      limit: limit + 1,
    });

    const page = rows.slice(0, limit);
    const cards = await this.enrichPosts(page, viewerUserId);
    const nextCursor =
      rows.length > limit ? this.encodeCursor(page[page.length - 1]) : null;

    return {
      data: cards,
      meta: { limit, nextCursor },
    };
  }

  async getPost(feedPostId: string, viewerUserId?: string) {
    const post = await this.requireActivePost(feedPostId);
    const [card] = await this.enrichPosts([post], viewerUserId);
    return card;
  }

  async toggleLike(feedPostId: string, userId: string) {
    await this.requireActivePost(feedPostId);

    const existing = await this.db.query.feedLikes.findFirst({
      where: and(
        eq(feedLikes.feedPostId, feedPostId),
        eq(feedLikes.userId, userId),
      ),
    });

    if (existing) {
      await this.db.delete(feedLikes).where(eq(feedLikes.id, existing.id));
      await this.db
        .update(feedPosts)
        .set({
          likeCount: sql`GREATEST(${feedPosts.likeCount} - 1, 0)`,
        })
        .where(eq(feedPosts.id, feedPostId));
      const post = await this.requireActivePost(feedPostId);
      return { liked: false, likeCount: post.likeCount };
    }

    await this.db.insert(feedLikes).values({
      id: createId(),
      feedPostId,
      userId,
    });
    await this.db
      .update(feedPosts)
      .set({ likeCount: sql`${feedPosts.likeCount} + 1` })
      .where(eq(feedPosts.id, feedPostId));
    const post = await this.requireActivePost(feedPostId);
    return { liked: true, likeCount: post.likeCount };
  }

  async listRootComments(
    feedPostId: string,
    query: ListFeedCommentsQueryDto,
    viewerUserId?: string,
  ) {
    await this.requireActivePost(feedPostId);
    const offset = (query.page - 1) * query.limit;
    const whereClause = and(
      eq(feedComments.feedPostId, feedPostId),
      isNull(feedComments.parentCommentId),
      eq(feedComments.status, FeedCommentStatus.ACTIVE),
    );

    const [rows, countRow] = await Promise.all([
      this.db.query.feedComments.findMany({
        where: whereClause,
        orderBy: [asc(feedComments.createdAt)],
        limit: query.limit,
        offset,
      }),
      this.db.select({ value: count() }).from(feedComments).where(whereClause),
    ]);

    const items = await this.enrichComments(rows, viewerUserId, true);
    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: Number(countRow[0]?.value ?? 0),
      },
    };
  }

  async listReplies(
    commentId: string,
    query: ListFeedCommentsQueryDto,
    viewerUserId?: string,
  ) {
    const parent = await this.requireActiveComment(commentId);
    if (parent.parentCommentId != null) {
      throw AppException.badRequest('Only root comments have replies');
    }

    const offset = (query.page - 1) * query.limit;
    const whereClause = and(
      eq(feedComments.parentCommentId, commentId),
      eq(feedComments.status, FeedCommentStatus.ACTIVE),
    );

    const [rows, countRow] = await Promise.all([
      this.db.query.feedComments.findMany({
        where: whereClause,
        orderBy: [asc(feedComments.createdAt)],
        limit: query.limit,
        offset,
      }),
      this.db.select({ value: count() }).from(feedComments).where(whereClause),
    ]);

    const items = await this.enrichComments(rows, viewerUserId, false);
    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: Number(countRow[0]?.value ?? 0),
      },
    };
  }

  async createComment(
    feedPostId: string,
    userId: string,
    input: CreateFeedCommentDto,
  ) {
    const post = await this.requireActivePost(feedPostId);
    const body = input.body.trim();
    if (!body) {
      throw AppException.badRequest('Comment body is required');
    }

    let parent: typeof feedComments.$inferSelect | null = null;
    if (input.parentCommentId) {
      parent = await this.requireActiveComment(input.parentCommentId);
      if (parent.feedPostId !== feedPostId) {
        throw AppException.badRequest('Parent comment belongs to another post');
      }
      if (parent.parentCommentId != null) {
        throw AppException.badRequest(
          'Replies cannot be nested further (max depth 2)',
        );
      }
    }

    const id = createId();
    await this.db.insert(feedComments).values({
      id,
      feedPostId,
      authorUserId: userId,
      parentCommentId: parent?.id ?? null,
      body,
      status: FeedCommentStatus.ACTIVE,
    });
    await this.db
      .update(feedPosts)
      .set({ commentCount: sql`${feedPosts.commentCount} + 1` })
      .where(eq(feedPosts.id, feedPostId));

    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, post.listingId),
    });
    const author = await this.db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { id: true, name: true },
    });

    if (!parent && listing && listing.ownerUserId !== userId) {
      this.notifications.notify({
        userId: listing.ownerUserId,
        type: NotificationType.FEED_COMMENT_ON_YOUR_LISTING,
        title: 'New comment on your listing',
        body: `${author?.name ?? 'Someone'} commented on "${listing.title}"`,
        entityType: NotificationEntityType.LISTING,
        entityId: listing.id,
        resources: {
          listingId: listing.id,
          listingTitle: listing.title,
          feedPostId,
          commentId: id,
          actorUserId: userId,
          actorName: author?.name,
        },
      });
    }

    if (parent && parent.authorUserId !== userId) {
      this.notifications.notify({
        userId: parent.authorUserId,
        type: NotificationType.FEED_COMMENT_REPLY,
        title: 'New reply to your comment',
        body: `${author?.name ?? 'Someone'} replied to your comment`,
        entityType: NotificationEntityType.LISTING,
        entityId: post.listingId,
        resources: {
          listingId: post.listingId,
          listingTitle: listing?.title,
          feedPostId,
          commentId: id,
          actorUserId: userId,
          actorName: author?.name,
        },
      });
    }

    const row = await this.requireActiveComment(id);
    const [item] = await this.enrichComments(
      [row],
      userId,
      row.parentCommentId == null,
    );
    return item;
  }

  async toggleCommentLike(commentId: string, userId: string) {
    const comment = await this.requireActiveComment(commentId);

    const existing = await this.db.query.feedCommentLikes.findFirst({
      where: and(
        eq(feedCommentLikes.commentId, commentId),
        eq(feedCommentLikes.userId, userId),
      ),
    });

    if (existing) {
      await this.db
        .delete(feedCommentLikes)
        .where(eq(feedCommentLikes.id, existing.id));
      await this.db
        .update(feedComments)
        .set({
          likeCount: sql`GREATEST(${feedComments.likeCount} - 1, 0)`,
        })
        .where(eq(feedComments.id, commentId));
      const refreshed = await this.requireActiveComment(commentId);
      return { liked: false, likeCount: refreshed.likeCount };
    }

    await this.db.insert(feedCommentLikes).values({
      id: createId(),
      commentId,
      userId,
    });
    await this.db
      .update(feedComments)
      .set({ likeCount: sql`${feedComments.likeCount} + 1` })
      .where(eq(feedComments.id, commentId));
    const refreshed = await this.requireActiveComment(commentId);
    return {
      liked: true,
      likeCount: refreshed.likeCount,
      feedPostId: comment.feedPostId,
    };
  }

  async hideComment(commentId: string, userId: string) {
    const comment = await this.requireActiveComment(commentId);
    const isAuthor = comment.authorUserId === userId;
    if (!isAuthor) {
      await this.identity.assertPlatformAdmin(userId);
    }

    const toHideIds = [comment.id];
    if (comment.parentCommentId == null) {
      const replies = await this.db.query.feedComments.findMany({
        where: and(
          eq(feedComments.parentCommentId, comment.id),
          eq(feedComments.status, FeedCommentStatus.ACTIVE),
        ),
        columns: { id: true },
      });
      toHideIds.push(...replies.map((row) => row.id));
    }

    await this.db
      .update(feedComments)
      .set({ status: FeedCommentStatus.HIDDEN })
      .where(inArray(feedComments.id, toHideIds));

    await this.db
      .update(feedPosts)
      .set({
        commentCount: sql`GREATEST(${feedPosts.commentCount} - ${toHideIds.length}, 0)`,
      })
      .where(eq(feedPosts.id, comment.feedPostId));

    return { deleted: true, id: commentId, hiddenCount: toHideIds.length };
  }

  async share(feedPostId: string, userId?: string) {
    await this.requireActivePost(feedPostId);
    await this.db.insert(feedShares).values({
      id: createId(),
      feedPostId,
      userId: userId ?? null,
    });
    await this.db
      .update(feedPosts)
      .set({ shareCount: sql`${feedPosts.shareCount} + 1` })
      .where(eq(feedPosts.id, feedPostId));

    const post = await this.requireActivePost(feedPostId);
    return {
      shareUrl: `${this.config.frontendOrigin}/feed/${feedPostId}`,
      shareCount: post.shareCount,
    };
  }

  async listByOwner(
    ownerUserId: string,
    query: ListFeedQueryDto,
    viewerUserId?: string,
  ) {
    return this.listFeedFiltered(
      query,
      viewerUserId,
      eq(listings.ownerUserId, ownerUserId),
    );
  }

  async listByOrganisation(
    organisationId: string,
    query: ListFeedQueryDto,
    viewerUserId?: string,
  ) {
    return this.listFeedFiltered(
      query,
      viewerUserId,
      eq(listings.organisationId, organisationId),
    );
  }

  private async listFeedFiltered(
    query: ListFeedQueryDto,
    viewerUserId: string | undefined,
    listingFilter: ReturnType<typeof eq>,
  ) {
    const limit = query.limit;
    const cursor = this.parseCursor(query.cursor);

    const filters = [
      eq(feedPosts.status, FeedPostStatus.ACTIVE),
      listingFilter,
    ];
    if (cursor) {
      filters.push(
        or(
          lt(feedPosts.publishedAt, cursor.publishedAt),
          and(
            eq(feedPosts.publishedAt, cursor.publishedAt),
            lt(feedPosts.id, cursor.id),
          ),
        )!,
      );
    }

    const joined = await this.db
      .select({ post: feedPosts })
      .from(feedPosts)
      .innerJoin(listings, eq(feedPosts.listingId, listings.id))
      .where(and(...filters))
      .orderBy(desc(feedPosts.publishedAt), desc(feedPosts.id))
      .limit(limit + 1);

    const page = joined.slice(0, limit).map((row) => row.post);
    const cards = await this.enrichPosts(page, viewerUserId);
    const nextCursor =
      joined.length > limit ? this.encodeCursor(page[page.length - 1]) : null;

    return {
      data: cards,
      meta: { limit, nextCursor },
    };
  }

  private async requireActivePost(feedPostId: string): Promise<FeedPostRow> {
    const post = await this.db.query.feedPosts.findFirst({
      where: eq(feedPosts.id, feedPostId),
    });
    if (!post || post.status !== FeedPostStatus.ACTIVE) {
      throw AppException.notFound('Feed post not found');
    }
    return post;
  }

  private async requireActiveComment(commentId: string) {
    const comment = await this.db.query.feedComments.findFirst({
      where: eq(feedComments.id, commentId),
    });
    if (!comment || comment.status !== FeedCommentStatus.ACTIVE) {
      throw AppException.notFound('Comment not found');
    }
    return comment;
  }

  private async enrichPosts(posts: FeedPostRow[], viewerUserId?: string) {
    if (posts.length === 0) {
      return [];
    }

    const listingIds = posts.map((post) => post.listingId);
    const videoIds = posts.map((post) => post.videoMediaId);
    const postIds = posts.map((post) => post.id);

    const listingRows = await this.db.query.listings.findMany({
      where: inArray(listings.id, listingIds),
    });
    const listingById = new Map(listingRows.map((row) => [row.id, row]));

    const ownerIds = [...new Set(listingRows.map((row) => row.ownerUserId))];
    const orgIds = [
      ...new Set(
        listingRows
          .map((row) => row.organisationId)
          .filter((id): id is string => id != null),
      ),
    ];

    type OrgSnippet = {
      id: string;
      name: string;
      slug: string;
      licenceVerifiedAt: Date | null;
    };

    const emptyOrgs: OrgSnippet[] = [];
    const [owners, orgs, mediaRows, likedRows, savedRows] = await Promise.all([
      this.db.query.user.findMany({
        where: inArray(userTable.id, ownerIds),
        columns: { id: true, name: true, image: true },
      }),
      orgIds.length > 0
        ? this.db.query.organisations.findMany({
            where: inArray(organisations.id, orgIds),
            columns: {
              id: true,
              name: true,
              slug: true,
              licenceVerifiedAt: true,
            },
          })
        : Promise.resolve(emptyOrgs),
      this.db.query.listingMedia.findMany({
        where: inArray(listingMedia.listingId, listingIds),
        orderBy: [asc(listingMedia.sortOrder), asc(listingMedia.createdAt)],
      }),
      viewerUserId
        ? this.db.query.feedLikes.findMany({
            where: and(
              inArray(feedLikes.feedPostId, postIds),
              eq(feedLikes.userId, viewerUserId),
            ),
            columns: { feedPostId: true },
          })
        : Promise.resolve([] as Array<{ feedPostId: string }>),
      viewerUserId
        ? this.db.query.savedListings.findMany({
            where: and(
              inArray(savedListings.listingId, listingIds),
              eq(savedListings.userId, viewerUserId),
            ),
            columns: { listingId: true },
          })
        : Promise.resolve([] as Array<{ listingId: string }>),
    ]);

    const ownerById = new Map(owners.map((row) => [row.id, row] as const));
    const orgById = new Map(orgs.map((row) => [row.id, row] as const));
    const likedSet = new Set(likedRows.map((row) => row.feedPostId));
    const savedSet = new Set(savedRows.map((row) => row.listingId));

    const mediaByListing = new Map<string, typeof mediaRows>();
    for (const row of mediaRows) {
      const bucket = mediaByListing.get(row.listingId) ?? [];
      bucket.push(row);
      mediaByListing.set(row.listingId, bucket);
    }

    const videoRows = mediaRows.filter((row) => videoIds.includes(row.id));
    const signedVideos = await this.signMedia(videoRows);
    const videoById = new Map(signedVideos.map((row) => [row.id, row]));

    return Promise.all(
      posts.map(async (post) => {
        const listing = listingById.get(post.listingId);
        if (!listing) {
          throw AppException.database(
            `Feed post ${post.id} missing listing ${post.listingId}`,
          );
        }
        const owner = ownerById.get(listing.ownerUserId);
        const org = listing.organisationId
          ? orgById.get(listing.organisationId)
          : undefined;
        const listingMediaRows = mediaByListing.get(listing.id) ?? [];
        const posterRow = listingMediaRows.find(
          (row) => row.kind === ListingMediaKind.PHOTO,
        );
        const poster = posterRow
          ? (await this.signMedia([posterRow]))[0]
          : null;
        const video = videoById.get(post.videoMediaId);
        if (!video) {
          throw AppException.database(
            `Feed post ${post.id} missing video media`,
          );
        }

        return {
          id: post.id,
          listingId: post.listingId,
          publishedAt: post.publishedAt,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          shareCount: post.shareCount,
          liked: likedSet.has(post.id),
          bookmarked: savedSet.has(post.listingId),
          listing: {
            id: listing.id,
            title: listing.title,
            listingType: listing.listingType,
            propertyType: listing.propertyType,
            priceMinor: listing.priceMinor,
            currency: listing.currency,
            city: listing.city,
            neighborhood: listing.neighborhood,
            verificationStatus: listing.verificationStatus,
            listingVerified:
              listing.verificationStatus === ListingVerificationStatus.VERIFIED,
            isPremium: listing.isPremium,
          },
          video: {
            mediaId: video.id,
            url: video.url,
            contentType: video.contentType,
          },
          poster: poster
            ? {
                mediaId: poster.id,
                url: poster.url,
                contentType: poster.contentType,
              }
            : null,
          owner: owner
            ? { id: owner.id, name: owner.name, image: owner.image }
            : { id: listing.ownerUserId, name: 'Owner', image: null },
          organisation: org
            ? {
                id: org.id,
                name: org.name,
                slug: org.slug,
                licenceVerified: org.licenceVerifiedAt != null,
              }
            : null,
        };
      }),
    );
  }

  private async enrichComments(
    rows: Array<typeof feedComments.$inferSelect>,
    viewerUserId: string | undefined,
    includeReplyCount: boolean,
  ) {
    if (rows.length === 0) {
      return [];
    }

    const authorIds = [...new Set(rows.map((row) => row.authorUserId))];
    const commentIds = rows.map((row) => row.id);

    const [authors, likedRows, replyCounts] = await Promise.all([
      this.db.query.user.findMany({
        where: inArray(userTable.id, authorIds),
        columns: { id: true, name: true, image: true },
      }),
      viewerUserId
        ? this.db.query.feedCommentLikes.findMany({
            where: and(
              inArray(feedCommentLikes.commentId, commentIds),
              eq(feedCommentLikes.userId, viewerUserId),
            ),
            columns: { commentId: true },
          })
        : Promise.resolve([] as Array<{ commentId: string }>),
      includeReplyCount
        ? this.db
            .select({
              parentCommentId: feedComments.parentCommentId,
              value: count(),
            })
            .from(feedComments)
            .where(
              and(
                inArray(feedComments.parentCommentId, commentIds),
                eq(feedComments.status, FeedCommentStatus.ACTIVE),
              ),
            )
            .groupBy(feedComments.parentCommentId)
        : Promise.resolve(
            [] as Array<{ parentCommentId: string | null; value: number }>,
          ),
    ]);

    const authorById = new Map(authors.map((row) => [row.id, row] as const));
    const likedSet = new Set(likedRows.map((row) => row.commentId));
    const replyCountByParent = new Map(
      replyCounts
        .filter(
          (row): row is { parentCommentId: string; value: number } =>
            row.parentCommentId != null,
        )
        .map((row) => [row.parentCommentId, Number(row.value)] as const),
    );
    return rows.map((row) => {
      const author = authorById.get(row.authorUserId);
      return {
        id: row.id,
        feedPostId: row.feedPostId,
        parentCommentId: row.parentCommentId,
        body: row.body,
        likeCount: row.likeCount,
        liked: likedSet.has(row.id),
        createdAt: row.createdAt,
        ...(includeReplyCount
          ? { replyCount: replyCountByParent.get(row.id) ?? 0 }
          : {}),
        author: author
          ? { id: author.id, name: author.name, image: author.image }
          : { id: row.authorUserId, name: 'User', image: null },
      };
    });
  }

  private async signMedia(rows: Array<typeof listingMedia.$inferSelect>) {
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        contentType: row.contentType,
        url: await this.storage.getSignedUrl({
          bucket: StorageBucket.LISTINGS,
          key: row.objectKey,
          expiresInSeconds: LISTING_MEDIA_SIGNED_URL_TTL_SECONDS,
        }),
      })),
    );
  }

  private parseCursor(
    cursor?: string,
  ): { publishedAt: Date; id: string } | null {
    if (!cursor) {
      return null;
    }
    const sep = cursor.indexOf('|');
    if (sep <= 0) {
      throw AppException.badRequest('Invalid feed cursor');
    }
    const publishedAt = new Date(cursor.slice(0, sep));
    const id = cursor.slice(sep + 1);
    if (Number.isNaN(publishedAt.getTime()) || !id) {
      throw AppException.badRequest('Invalid feed cursor');
    }
    return { publishedAt, id };
  }

  private encodeCursor(post: FeedPostRow): string {
    return `${post.publishedAt.toISOString()}|${post.id}`;
  }
}
