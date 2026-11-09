import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { feedPosts } from '@mykwatta/core/database/schema/feed.schema';
import { listingMedia } from '@mykwatta/core/database/schema/listing-media.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { FeedPostStatus } from '@mykwatta/modules/feed/constants';
import {
  ListingMediaKind,
  ListingStatus,
  ListingVerificationStatus,
} from '@mykwatta/modules/listings/constants';
import { PusherService } from '@mykwatta/shared/pusher';

@Injectable()
export class FeedSyncService {
  private readonly logger = new Logger(FeedSyncService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly pusher: PusherService,
  ) {}

  /**
   * Platform-only publish gate: ACTIVE feed post iff listing is PUBLISHED,
   * VERIFIED, not frozen/duplicate, and has ≥1 VIDEO.
   */
  async syncListing(listingId: string): Promise<void> {
    try {
      const listing = await this.db.query.listings.findFirst({
        where: eq(listings.id, listingId),
      });
      if (!listing) {
        this.logger.warn(`feed sync skipped: listing ${listingId} missing`);
        return;
      }

      const video = await this.db.query.listingMedia.findFirst({
        where: and(
          eq(listingMedia.listingId, listingId),
          eq(listingMedia.kind, ListingMediaKind.VIDEO),
        ),
        orderBy: [asc(listingMedia.sortOrder), asc(listingMedia.createdAt)],
      });

      const eligible =
        listing.status === ListingStatus.PUBLISHED &&
        listing.verificationStatus === ListingVerificationStatus.VERIFIED &&
        listing.trustFrozenAt == null &&
        listing.duplicateOfListingId == null &&
        video != null;

      const existing = await this.db.query.feedPosts.findFirst({
        where: eq(feedPosts.listingId, listingId),
      });

      if (eligible && video) {
        if (!existing) {
          const id = createId();
          const publishedAt = new Date();
          await this.db.insert(feedPosts).values({
            id,
            listingId,
            videoMediaId: video.id,
            status: FeedPostStatus.ACTIVE,
            publishedAt,
          });
          await this.pusher.emitFeedPost({
            feedPostId: id,
            listingId,
            publishedAt: publishedAt.toISOString(),
          });
          this.logger.log(`feed post created listing=${listingId} id=${id}`);
          return;
        }

        const wasHidden = existing.status !== FeedPostStatus.ACTIVE;
        const publishedAt = wasHidden ? new Date() : existing.publishedAt;
        await this.db
          .update(feedPosts)
          .set({
            videoMediaId: video.id,
            status: FeedPostStatus.ACTIVE,
            ...(wasHidden ? { publishedAt } : {}),
          })
          .where(eq(feedPosts.id, existing.id));

        if (wasHidden) {
          await this.pusher.emitFeedPost({
            feedPostId: existing.id,
            listingId,
            publishedAt: publishedAt.toISOString(),
          });
        }
        return;
      }

      if (existing && existing.status === FeedPostStatus.ACTIVE) {
        await this.db
          .update(feedPosts)
          .set({ status: FeedPostStatus.HIDDEN })
          .where(eq(feedPosts.id, existing.id));
        this.logger.log(`feed post hidden listing=${listingId}`);
      }
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `feed sync failed listing=${listingId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to sync feed post', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
