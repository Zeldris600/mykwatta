import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { feedPosts } from '@mykwatta/core/database/schema/feed.schema';
import { organisations } from '@mykwatta/core/database/schema/identity.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { FeedPostStatus } from '@mykwatta/modules/feed/constants';
import type { ListFeedQueryDto } from '@mykwatta/modules/feed/dto';
import { FeedService } from '@mykwatta/modules/feed/services/feed.service';
import { ListingStatus } from '@mykwatta/modules/listings/constants';

@Injectable()
export class FeedProfilesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly feed: FeedService,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { id: true, name: true, image: true },
    });
    if (!user) {
      throw AppException.notFound('User not found');
    }

    const [listingCountRow, feedPostCountRow] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(listings)
        .where(
          and(
            eq(listings.ownerUserId, userId),
            eq(listings.status, ListingStatus.PUBLISHED),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(feedPosts)
        .innerJoin(listings, eq(feedPosts.listingId, listings.id))
        .where(
          and(
            eq(listings.ownerUserId, userId),
            eq(feedPosts.status, FeedPostStatus.ACTIVE),
          ),
        ),
    ]);

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      listingCount: Number(listingCountRow[0]?.value ?? 0),
      feedPostCount: Number(feedPostCountRow[0]?.value ?? 0),
    };
  }

  async getUserFeed(
    userId: string,
    query: ListFeedQueryDto,
    viewerUserId?: string,
  ) {
    await this.getUserProfile(userId);
    return this.feed.listByOwner(userId, query, viewerUserId);
  }

  async getOrganisationProfile(organisationId: string) {
    const org = await this.db.query.organisations.findFirst({
      where: eq(organisations.id, organisationId),
      columns: {
        id: true,
        name: true,
        slug: true,
        licenceVerifiedAt: true,
      },
    });
    if (!org) {
      throw AppException.notFound('Organisation not found');
    }

    const [listingCountRow, feedPostCountRow] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(listings)
        .where(
          and(
            eq(listings.organisationId, organisationId),
            eq(listings.status, ListingStatus.PUBLISHED),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(feedPosts)
        .innerJoin(listings, eq(feedPosts.listingId, listings.id))
        .where(
          and(
            eq(listings.organisationId, organisationId),
            eq(feedPosts.status, FeedPostStatus.ACTIVE),
          ),
        ),
    ]);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      licenceVerified: org.licenceVerifiedAt != null,
      listingCount: Number(listingCountRow[0]?.value ?? 0),
      feedPostCount: Number(feedPostCountRow[0]?.value ?? 0),
    };
  }

  async getOrganisationFeed(
    organisationId: string,
    query: ListFeedQueryDto,
    viewerUserId?: string,
  ) {
    await this.getOrganisationProfile(organisationId);
    return this.feed.listByOrganisation(
      organisationId,
      query,
      viewerUserId,
    );
  }
}
