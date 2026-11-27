import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, or } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingDeals } from '@mykwatta/core/database/schema/deals.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { ApplicationType } from '@mykwatta/modules/applications/constants';
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';
import type {
  CancelDealDto,
  CompleteDealDto,
} from '@mykwatta/modules/deals/dto';
import { ListingStatus } from '@mykwatta/modules/listings/constants';
import { ListingsService } from '@mykwatta/modules/listings/services';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

export type OpenDealFromApplicationInput = {
  applicationId: string;
  listingId: string;
  ownerUserId: string;
  counterpartyUserId: string;
  applicationType: ApplicationType;
  amountMinor: number;
  currency: CurrencyCode;
  startsAt?: Date | null;
  notes?: string | null;
  commissionBps?: number | null;
};

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listingsService: ListingsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Called when an application is ACCEPTED.
   * Creates an ACTIVE deal and moves the listing to UNDER_CONTRACT.
   */
  async openFromAcceptedApplication(
    input: OpenDealFromApplicationInput,
  ): Promise<{ id: string }> {
    const existing = await this.db.query.listingDeals.findFirst({
      where: eq(listingDeals.applicationId, input.applicationId),
      columns: { id: true },
    });
    if (existing) {
      return existing;
    }

    const activeOnListing = await this.db.query.listingDeals.findFirst({
      where: and(
        eq(listingDeals.listingId, input.listingId),
        eq(listingDeals.status, DealStatus.ACTIVE),
      ),
      columns: { id: true },
    });
    if (activeOnListing) {
      throw AppException.conflict('This listing already has an active deal');
    }

    const id = createId();
    const type =
      input.applicationType === ApplicationType.PURCHASE_OFFER
        ? DealType.SALE_AGREEMENT
        : DealType.LEASE;

    await this.db.transaction(async (tx) => {
      await tx.insert(listingDeals).values({
        id,
        listingId: input.listingId,
        applicationId: input.applicationId,
        ownerUserId: input.ownerUserId,
        counterpartyUserId: input.counterpartyUserId,
        type,
        status: DealStatus.ACTIVE,
        amountMinor: input.amountMinor,
        commissionBps: input.commissionBps ?? null,
        currency: input.currency,
        startsAt: input.startsAt ?? null,
        notes: input.notes?.trim() || null,
        activatedAt: new Date(),
      });

      await tx
        .update(listings)
        .set({ status: ListingStatus.UNDER_CONTRACT })
        .where(eq(listings.id, input.listingId));
    });

    this.logger.log(
      `Deal opened id=${id} listing=${input.listingId} application=${input.applicationId} type=${type}`,
    );
    return { id };
  }

  async getById(dealId: string, userId: string) {
    const deal = await this.requireDeal(dealId);
    this.assertParticipant(deal, userId);
    return deal;
  }

  async listMine(userId: string) {
    try {
      return await this.db.query.listingDeals.findMany({
        where: or(
          eq(listingDeals.ownerUserId, userId),
          eq(listingDeals.counterpartyUserId, userId),
        ),
        orderBy: [desc(listingDeals.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list deals', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async complete(dealId: string, userId: string, input: CompleteDealDto) {
    try {
      const deal = await this.requireDeal(dealId);
      await this.listingsService.assertUserCanManage(deal.listingId, userId);

      if (deal.status !== DealStatus.ACTIVE) {
        throw AppException.badRequest('Only ACTIVE deals can be completed');
      }

      const listing = await this.listingsService.getById(deal.listingId);
      const now = new Date();
      await this.db.transaction(async (tx) => {
        await tx
          .update(listingDeals)
          .set({
            status: DealStatus.COMPLETED,
            notes: input.notes?.trim() || deal.notes,
            closedAt: now,
          })
          .where(eq(listingDeals.id, dealId));

        await tx
          .update(listings)
          .set({ status: ListingStatus.ARCHIVED })
          .where(eq(listings.id, deal.listingId));
      });

      this.notifications.notify({
        userId: deal.counterpartyUserId,
        type: NotificationType.DEAL_COMPLETED,
        title: 'Deal completed',
        body: `The ${deal.type === DealType.LEASE ? 'lease' : 'sale'} for "${listing.title}" is complete.`,
        entityType: NotificationEntityType.DEAL,
        entityId: dealId,
        resources: {
          dealId,
          listingId: listing.id,
          listingTitle: listing.title,
          applicationId: deal.applicationId,
          actorUserId: userId,
        },
      });

      return this.requireDeal(dealId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to complete deal', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async cancel(dealId: string, userId: string, input: CancelDealDto) {
    try {
      const deal = await this.requireDeal(dealId);
      const isOwnerManager = await this.canManageListing(
        deal.listingId,
        userId,
      );
      const isCounterparty = deal.counterpartyUserId === userId;
      if (!isOwnerManager && !isCounterparty) {
        throw AppException.forbidden('You cannot cancel this deal');
      }

      if (deal.status !== DealStatus.ACTIVE) {
        throw AppException.badRequest('Only ACTIVE deals can be cancelled');
      }

      const listing = await this.listingsService.getById(deal.listingId);
      const now = new Date();
      await this.db.transaction(async (tx) => {
        await tx
          .update(listingDeals)
          .set({
            status: DealStatus.CANCELLED,
            cancelledReason: input.reason.trim(),
            closedAt: now,
          })
          .where(eq(listingDeals.id, dealId));

        // Return listing to market when a deal falls through.
        await tx
          .update(listings)
          .set({
            status: ListingStatus.PUBLISHED,
            publishedAt: now,
          })
          .where(eq(listings.id, deal.listingId));
      });

      const notifyUserId = isOwnerManager
        ? deal.counterpartyUserId
        : deal.ownerUserId;
      this.notifications.notify({
        userId: notifyUserId,
        type: NotificationType.DEAL_CANCELLED,
        title: 'Deal cancelled',
        body: `The ${deal.type === DealType.LEASE ? 'lease' : 'sale'} for "${listing.title}" was cancelled: ${input.reason.trim()}`,
        entityType: NotificationEntityType.DEAL,
        entityId: dealId,
        resources: {
          dealId,
          listingId: listing.id,
          listingTitle: listing.title,
          applicationId: deal.applicationId,
          actorUserId: userId,
        },
      });

      return this.requireDeal(dealId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to cancel deal', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async requireDeal(dealId: string) {
    const deal = await this.db.query.listingDeals.findFirst({
      where: eq(listingDeals.id, dealId),
    });
    if (!deal) {
      throw AppException.notFound(`Deal ${dealId} not found`);
    }
    return deal;
  }

  private assertParticipant(
    deal: { ownerUserId: string; counterpartyUserId: string },
    userId: string,
  ): void {
    if (deal.ownerUserId !== userId && deal.counterpartyUserId !== userId) {
      throw AppException.forbidden('You cannot view this deal');
    }
  }

  private async canManageListing(
    listingId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      await this.listingsService.assertUserCanManage(listingId, userId);
      return true;
    } catch {
      return false;
    }
  }
}
