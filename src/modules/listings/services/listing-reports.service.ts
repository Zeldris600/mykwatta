import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingReports } from '@mykwatta/core/database/schema/listing-reports.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  LISTING_REPORT_AUTO_FREEZE_THRESHOLD,
  ListingReportReason,
  ListingReportStatus,
  ListingStatus,
} from '@mykwatta/modules/listings/constants';
import type {
  CreateListingReportDto,
  DecideListingReportDto,
} from '@mykwatta/modules/listings/dto';
import { IdentityService } from '@mykwatta/modules/identity/services';
import { ListingsService } from '@mykwatta/modules/listings/services/listings.service';

@Injectable()
export class ListingReportsService {
  private readonly logger = new Logger(ListingReportsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listingsService: ListingsService,
    private readonly identity: IdentityService,
  ) {}

  async create(
    listingId: string,
    reporterUserId: string,
    input: CreateListingReportDto,
  ) {
    try {
      const listing = await this.listingsService.getById(listingId);
      if (listing.status !== ListingStatus.PUBLISHED) {
        throw AppException.notFound(`Listing ${listingId} not found`);
      }
      if (listing.ownerUserId === reporterUserId) {
        throw AppException.forbidden('You cannot report your own listing');
      }

      const id = createId();
      await this.db.insert(listingReports).values({
        id,
        listingId,
        reporterUserId,
        reason: input.reason,
        details: input.details?.trim() || null,
        status: ListingReportStatus.OPEN,
      });

      await this.maybeAutoFreezeListing(listingId, input.reason);

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `create listing report failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create listing report', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listForAdmin(adminUserId: string) {
    await this.identity.assertPlatformAdmin(adminUserId);
    return this.db.query.listingReports.findMany({
      orderBy: [desc(listingReports.createdAt)],
    });
  }

  async decide(
    reportId: string,
    adminUserId: string,
    input: DecideListingReportDto,
  ) {
    await this.identity.assertPlatformAdmin(adminUserId);
    const report = await this.getById(reportId);
    if (report.status !== ListingReportStatus.OPEN) {
      throw AppException.badRequest('Only open reports can be decided');
    }

    await this.db
      .update(listingReports)
      .set({ status: input.status })
      .where(eq(listingReports.id, reportId));

    if (input.note?.trim()) {
      this.logger.log(
        `Listing report ${reportId} decided as ${input.status}: ${input.note.trim()}`,
      );
    }

    return this.getById(reportId);
  }

  private async maybeAutoFreezeListing(
    listingId: string,
    reason: ListingReportReason,
  ): Promise<void> {
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, listingId),
      columns: { trustFrozenAt: true },
    });
    if (listing?.trustFrozenAt) {
      return;
    }

    let shouldFreeze = reason === ListingReportReason.FRAUD;
    if (!shouldFreeze) {
      const [{ value: openCount }] = await this.db
        .select({ value: count() })
        .from(listingReports)
        .where(
          and(
            eq(listingReports.listingId, listingId),
            eq(listingReports.status, ListingReportStatus.OPEN),
          ),
        );
      shouldFreeze = Number(openCount) >= LISTING_REPORT_AUTO_FREEZE_THRESHOLD;
    }

    if (!shouldFreeze) {
      return;
    }

    const freezeReason =
      reason === ListingReportReason.FRAUD
        ? 'Auto-frozen: fraud report'
        : `Auto-frozen: ${LISTING_REPORT_AUTO_FREEZE_THRESHOLD}+ open reports`;

    await this.db
      .update(listings)
      .set({
        trustFrozenAt: new Date(),
        trustFrozenReason: freezeReason,
      })
      .where(eq(listings.id, listingId));

    this.listingsService.enqueueFeedSync(listingId);
  }

  private async getById(id: string) {
    const report = await this.db.query.listingReports.findFirst({
      where: eq(listingReports.id, id),
    });
    if (!report) {
      throw AppException.notFound(`Listing report ${id} not found`);
    }
    return report;
  }
}
