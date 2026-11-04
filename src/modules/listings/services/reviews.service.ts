import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { listingReviews } from '@mykwatta/core/database/schema/reviews.schema';
import {
  ListingStatus,
  ReviewStatus,
} from '@mykwatta/modules/listings/constants';
import type {
  CreateReviewDto,
  UpdateReviewDto,
} from '@mykwatta/modules/listings/dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listForListing(listingId: string) {
    try {
      await this.assertPublishedListing(listingId);

      const rows = await this.db.query.listingReviews.findMany({
        where: and(
          eq(listingReviews.listingId, listingId),
          eq(listingReviews.status, ReviewStatus.ACTIVE),
        ),
        orderBy: [desc(listingReviews.createdAt)],
      });

      const avgRow = await this.db
        .select({
          average: sql<number>`coalesce(avg(${listingReviews.rating}), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(listingReviews)
        .where(
          and(
            eq(listingReviews.listingId, listingId),
            eq(listingReviews.status, ReviewStatus.ACTIVE),
          ),
        );

      return {
        data: rows,
        meta: {
          averageRating: Number(avgRow[0]?.average ?? 0),
          total: avgRow[0]?.count ?? 0,
        },
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list reviews', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async create(
    listingId: string,
    authorUserId: string,
    input: CreateReviewDto,
  ) {
    try {
      const listing = await this.assertPublishedListing(listingId);

      if (listing.ownerUserId === authorUserId) {
        throw AppException.forbidden('You cannot review your own listing');
      }

      const existing = await this.db.query.listingReviews.findFirst({
        where: and(
          eq(listingReviews.listingId, listingId),
          eq(listingReviews.authorUserId, authorUserId),
        ),
      });
      if (existing) {
        throw AppException.conflict(
          'You have already reviewed this listing. Update your existing review instead.',
        );
      }

      const id = createId();
      await this.db.insert(listingReviews).values({
        id,
        listingId,
        authorUserId,
        rating: input.rating,
        comment: input.comment.trim(),
        status: ReviewStatus.ACTIVE,
      });

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `create review failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create review', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async update(
    listingId: string,
    reviewId: string,
    authorUserId: string,
    input: UpdateReviewDto,
  ) {
    try {
      const review = await this.getById(reviewId);
      if (review.listingId !== listingId) {
        throw AppException.notFound('Review not found for this listing');
      }
      if (review.authorUserId !== authorUserId) {
        throw AppException.forbidden('You can only update your own review');
      }
      if (review.status !== ReviewStatus.ACTIVE) {
        throw AppException.badRequest('Hidden reviews cannot be updated');
      }

      await this.db
        .update(listingReviews)
        .set({
          ...(input.rating !== undefined ? { rating: input.rating } : {}),
          ...(input.comment !== undefined
            ? { comment: input.comment.trim() }
            : {}),
        })
        .where(eq(listingReviews.id, reviewId));

      return this.getById(reviewId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update review', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async remove(listingId: string, reviewId: string, authorUserId: string) {
    try {
      const review = await this.getById(reviewId);
      if (review.listingId !== listingId) {
        throw AppException.notFound('Review not found for this listing');
      }
      if (review.authorUserId !== authorUserId) {
        throw AppException.forbidden('You can only delete your own review');
      }

      await this.db
        .update(listingReviews)
        .set({ status: ReviewStatus.HIDDEN })
        .where(eq(listingReviews.id, reviewId));

      return { id: reviewId, status: ReviewStatus.HIDDEN };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to delete review', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getById(id: string) {
    const review = await this.db.query.listingReviews.findFirst({
      where: eq(listingReviews.id, id),
    });
    if (!review) {
      throw AppException.notFound(`Review ${id} not found`);
    }
    return review;
  }

  private async assertPublishedListing(listingId: string) {
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });
    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw AppException.notFound(`Listing ${listingId} not found`);
    }
    return listing;
  }
}
