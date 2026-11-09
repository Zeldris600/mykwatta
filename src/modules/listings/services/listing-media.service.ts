import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { memoryStorage } from 'multer';
import type { Options as MulterOptions } from 'multer';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingMedia } from '@mykwatta/core/database/schema/listing-media.schema';
import {
  LISTING_MEDIA_ALLOWED_MIME_TYPES,
  LISTING_MEDIA_MAX_BYTES,
  LISTING_MEDIA_MAX_PER_LISTING,
  LISTING_MEDIA_SIGNED_URL_TTL_SECONDS,
  LISTING_VIDEO_ALLOWED_MIME_TYPES,
  LISTING_VIDEO_MAX_BYTES,
  LISTING_VIDEO_MAX_PER_LISTING,
  ListingMediaKind,
} from '@mykwatta/modules/listings/constants';
import type { UploadListingMediaDto } from '@mykwatta/modules/listings/dto';
import { ListingsService } from '@mykwatta/modules/listings/services/listings.service';
import { QueueJobName, QueueName } from '@mykwatta/shared/queue';
import {
  assertUploadedFile,
  listingMediaObjectKey,
  StorageBucket,
  StorageService,
  type UploadedFileLike,
} from '@mykwatta/shared/storage';

/** Multer limit uses the larger video cap; service enforces per-kind limits. */
export const listingMediaMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: LISTING_VIDEO_MAX_BYTES, files: 1 },
};

@Injectable()
export class ListingMediaService {
  private readonly logger = new Logger(ListingMediaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @InjectQueue(QueueName.FEED_SYNC)
    private readonly feedSyncQueue: Queue,
    private readonly listings: ListingsService,
    private readonly storage: StorageService,
  ) {}

  async listForListing(listingId: string, viewerUserId?: string) {
    await this.listings.getPublicOrOwned(listingId, viewerUserId);
    const rows = await this.loadMediaRows(listingId);
    return this.withSignedUrls(rows);
  }

  async upload(
    listingId: string,
    userId: string,
    file: UploadedFileLike | undefined,
    input: UploadListingMediaDto,
  ) {
    try {
      await this.listings.assertUserCanManage(listingId, userId);

      const kind = input.kind ?? ListingMediaKind.PHOTO;
      const isVideo = kind === ListingMediaKind.VIDEO;
      const maxBytes = isVideo
        ? LISTING_VIDEO_MAX_BYTES
        : LISTING_MEDIA_MAX_BYTES;
      const allowedMimeTypes = isVideo
        ? LISTING_VIDEO_ALLOWED_MIME_TYPES
        : LISTING_MEDIA_ALLOWED_MIME_TYPES;

      const uploaded = assertUploadedFile(file, {
        field: 'file',
        maxBytes,
        allowedMimeTypes,
      });

      const contentType = uploaded.mimetype.trim().toLowerCase();
      if (
        isVideo &&
        !(LISTING_VIDEO_ALLOWED_MIME_TYPES as readonly string[]).includes(
          contentType,
        )
      ) {
        throw AppException.badRequest(
          'VIDEO kind requires video/mp4 or video/webm',
        );
      }
      if (
        !isVideo &&
        (LISTING_VIDEO_ALLOWED_MIME_TYPES as readonly string[]).includes(
          contentType,
        )
      ) {
        throw AppException.badRequest('Video files must use kind=VIDEO');
      }

      const [{ value: existingCount }] = await this.db
        .select({ value: count() })
        .from(listingMedia)
        .where(eq(listingMedia.listingId, listingId));

      if (Number(existingCount) >= LISTING_MEDIA_MAX_PER_LISTING) {
        throw AppException.badRequest(
          `Listings may have at most ${LISTING_MEDIA_MAX_PER_LISTING} media items`,
        );
      }

      if (isVideo) {
        const [{ value: videoCount }] = await this.db
          .select({ value: count() })
          .from(listingMedia)
          .where(
            and(
              eq(listingMedia.listingId, listingId),
              eq(listingMedia.kind, ListingMediaKind.VIDEO),
            ),
          );
        if (Number(videoCount) >= LISTING_VIDEO_MAX_PER_LISTING) {
          throw AppException.badRequest(
            `Listings may have at most ${LISTING_VIDEO_MAX_PER_LISTING} videos`,
          );
        }
      }

      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const [{ value: maxSort }] = await this.db
          .select({ value: max(listingMedia.sortOrder) })
          .from(listingMedia)
          .where(eq(listingMedia.listingId, listingId));
        sortOrder = (maxSort ?? -1) + 1;
      }

      const mediaId = createId();
      const objectKey = listingMediaObjectKey({
        listingId,
        mediaId,
        contentType,
      });

      await this.storage.putObject({
        bucket: StorageBucket.LISTINGS,
        key: objectKey,
        body: uploaded.buffer,
        contentType,
        metadata: {
          listingId,
          mediaId,
          uploadedBy: userId,
        },
      });

      try {
        await this.db.insert(listingMedia).values({
          id: mediaId,
          listingId,
          objectKey,
          contentType,
          sortOrder,
          kind,
          qualityScore: qualityScoreForUpload(uploaded.size),
          caption: input.caption?.trim() || null,
        });
      } catch (error) {
        await this.storage
          .deleteObject({
            bucket: StorageBucket.LISTINGS,
            key: objectKey,
          })
          .catch(() => undefined);
        throw error;
      }

      if (isVideo) {
        this.enqueueFeedSync(listingId);
      }

      const row = await this.db.query.listingMedia.findFirst({
        where: eq(listingMedia.id, mediaId),
      });
      if (!row) {
        throw AppException.database('Failed to load uploaded listing media');
      }
      return (await this.withSignedUrls([row]))[0];
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `listing media upload failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to upload listing media', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async remove(listingId: string, mediaId: string, userId: string) {
    try {
      await this.listings.assertUserCanManage(listingId, userId);

      const row = await this.db.query.listingMedia.findFirst({
        where: eq(listingMedia.id, mediaId),
      });
      if (!row || row.listingId !== listingId) {
        throw AppException.notFound('Listing media not found');
      }

      await this.db.delete(listingMedia).where(eq(listingMedia.id, mediaId));
      await this.storage
        .deleteObject({
          bucket: StorageBucket.LISTINGS,
          key: row.objectKey,
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to delete storage object ${row.objectKey}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      if (row.kind === ListingMediaKind.VIDEO) {
        this.enqueueFeedSync(listingId);
      }

      return { deleted: true, id: mediaId };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to delete listing media', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async attachMediaToListings<T extends { id: string }>(
    rows: T[],
  ): Promise<
    Array<
      T & { media: Awaited<ReturnType<ListingMediaService['withSignedUrls']>> }
    >
  > {
    if (rows.length === 0) {
      return [];
    }

    const listingIds = rows.map((row) => row.id);
    const mediaRows = await this.db.query.listingMedia.findMany({
      where: inArray(listingMedia.listingId, listingIds),
      orderBy: [asc(listingMedia.sortOrder), asc(listingMedia.createdAt)],
    });

    const signed = await this.withSignedUrls(mediaRows);
    const byListing = new Map<string, typeof signed>();
    for (const item of signed) {
      const bucket = byListing.get(item.listingId) ?? [];
      bucket.push(item);
      byListing.set(item.listingId, bucket);
    }

    return rows.map((row) => ({
      ...row,
      media: byListing.get(row.id) ?? [],
    }));
  }

  private enqueueFeedSync(listingId: string): void {
    void this.feedSyncQueue
      .add(QueueJobName.SYNC_FEED_POST, { listingId })
      .catch((error: unknown) => {
        this.logger.warn(
          `feed sync enqueue failed listing=${listingId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  private async loadMediaRows(listingId: string) {
    return this.db.query.listingMedia.findMany({
      where: eq(listingMedia.listingId, listingId),
      orderBy: [asc(listingMedia.sortOrder), asc(listingMedia.createdAt)],
    });
  }

  private async withSignedUrls(rows: Array<typeof listingMedia.$inferSelect>) {
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        listingId: row.listingId,
        contentType: row.contentType,
        sortOrder: row.sortOrder,
        kind: row.kind,
        qualityScore: row.qualityScore,
        caption: row.caption,
        createdAt: row.createdAt,
        url: await this.storage.getSignedUrl({
          bucket: StorageBucket.LISTINGS,
          key: row.objectKey,
          expiresInSeconds: LISTING_MEDIA_SIGNED_URL_TTL_SECONDS,
        }),
      })),
    );
  }
}

/**
 * Watermarking is stubbed until the `sharp` package is installed.
 * Uploads still receive a size-based quality score.
 */
function qualityScoreForUpload(size: number): number {
  if (size >= 800_000) {
    return 90;
  }
  if (size >= 300_000) {
    return 70;
  }
  if (size >= 80_000) {
    return 50;
  }
  return 30;
}
