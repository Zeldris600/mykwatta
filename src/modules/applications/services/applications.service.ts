import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingApplications } from '@mykwatta/core/database/schema/applications.schema';
import { payments } from '@mykwatta/core/database/schema/payments.schema';
import {
  ACTIVE_APPLICATION_STATUSES,
  ApplicationStatus,
  ApplicationType,
} from '@mykwatta/modules/applications/constants';
import type {
  CreateApplicationDto,
  DecideApplicationDto,
} from '@mykwatta/modules/applications/dto';
import { DealsService } from '@mykwatta/modules/deals/services';
import {
  ListingStatus,
  ListingType,
} from '@mykwatta/modules/listings/constants';
import { ListingsService } from '@mykwatta/modules/listings/services';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';
import { PaymentStatus } from '@mykwatta/modules/payments/constants';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listings: ListingsService,
    private readonly notifications: NotificationsService,
    private readonly deals: DealsService,
  ) {}

  async submit(applicantUserId: string, input: CreateApplicationDto) {
    try {
      const payment = await this.db.query.payments.findFirst({
        where: eq(payments.id, input.paymentId),
      });
      if (!payment || payment.userId !== applicantUserId) {
        throw AppException.notFound('Deposit payment not found');
      }
      if (payment.status !== PaymentStatus.SUCCEEDED) {
        throw AppException.badRequest(
          'A succeeded listing deposit is required before applying',
        );
      }
      if (!payment.listingId) {
        throw AppException.badRequest('Deposit is not linked to a listing');
      }

      const listing = await this.listings.getById(payment.listingId);
      if (listing.status !== ListingStatus.PUBLISHED) {
        throw AppException.badRequest(
          'Applications are only accepted on published listings',
        );
      }
      if (listing.ownerUserId === applicantUserId) {
        throw AppException.forbidden('You cannot apply to your own listing');
      }

      this.assertTypeMatchesListing(input.type, listing.listingType);
      if (input.type === ApplicationType.PURCHASE_OFFER) {
        if (input.offerAmountMinor === undefined) {
          throw AppException.badRequest(
            'offerAmountMinor is required for PURCHASE_OFFER',
          );
        }
      }

      const existingOnPayment =
        await this.db.query.listingApplications.findFirst({
          where: eq(listingApplications.paymentId, payment.id),
        });
      if (existingOnPayment) {
        throw AppException.conflict(
          'This deposit already has an application attached',
        );
      }

      const active = await this.db.query.listingApplications.findFirst({
        where: and(
          eq(listingApplications.listingId, listing.id),
          eq(listingApplications.applicantUserId, applicantUserId),
          inArray(listingApplications.status, [...ACTIVE_APPLICATION_STATUSES]),
        ),
      });
      if (active) {
        throw AppException.conflict(
          'You already have an active application on this listing',
        );
      }

      const id = createId();
      await this.db.insert(listingApplications).values({
        id,
        listingId: listing.id,
        applicantUserId,
        paymentId: payment.id,
        type: input.type,
        status: ApplicationStatus.SUBMITTED,
        message: input.message.trim(),
        offerAmountMinor: input.offerAmountMinor ?? null,
        currency: input.currency ?? payment.currency ?? CurrencyCode.XAF,
        proposedMoveInAt: input.proposedMoveInAt ?? null,
      });

      this.notifications.notify({
        userId: listing.ownerUserId,
        type: NotificationType.APPLICATION_SUBMITTED,
        title: 'New application received',
        body: `A ${input.type === ApplicationType.PURCHASE_OFFER ? 'purchase offer' : 'rental application'} was submitted for "${listing.title}".`,
        entityType: NotificationEntityType.APPLICATION,
        entityId: id,
        resources: {
          applicationId: id,
          listingId: listing.id,
          listingTitle: listing.title,
          paymentId: payment.id,
          actorUserId: applicantUserId,
        },
      });

      return this.getById(id);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `submit application failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to submit application', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(applicantUserId: string) {
    try {
      return await this.db.query.listingApplications.findMany({
        where: eq(listingApplications.applicantUserId, applicantUserId),
        orderBy: [desc(listingApplications.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list my applications', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listForListing(listingId: string, ownerUserId: string) {
    try {
      await this.listings.assertUserCanManage(listingId, ownerUserId);
      return await this.db.query.listingApplications.findMany({
        where: eq(listingApplications.listingId, listingId),
        orderBy: [desc(listingApplications.createdAt)],
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list listing applications', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async decide(
    applicationId: string,
    ownerUserId: string,
    input: DecideApplicationDto,
  ) {
    try {
      if (
        input.status !== ApplicationStatus.ACCEPTED &&
        input.status !== ApplicationStatus.REJECTED
      ) {
        throw AppException.badRequest(
          'Decision status must be ACCEPTED or REJECTED',
        );
      }
      if (
        input.status === ApplicationStatus.REJECTED &&
        !input.decisionReason?.trim()
      ) {
        throw AppException.badRequest(
          'decisionReason is required when rejecting',
        );
      }

      const application = await this.getById(applicationId);
      await this.listings.assertUserCanManage(
        application.listingId,
        ownerUserId,
      );

      if (
        application.status !== ApplicationStatus.SUBMITTED &&
        application.status !== ApplicationStatus.UNDER_REVIEW
      ) {
        throw AppException.badRequest(
          'Only SUBMITTED or UNDER_REVIEW applications can be decided',
        );
      }

      await this.db
        .update(listingApplications)
        .set({
          status: input.status,
          decisionReason: input.decisionReason?.trim() || null,
          decidedByUserId: ownerUserId,
          decidedAt: new Date(),
        })
        .where(eq(listingApplications.id, applicationId));

      const listing = await this.listings.getById(application.listingId);
      let dealId: string | undefined;

      if (input.status === ApplicationStatus.ACCEPTED) {
        const amountMinor =
          application.type === ApplicationType.PURCHASE_OFFER
            ? (application.offerAmountMinor ?? listing.priceMinor)
            : listing.priceMinor;

        const deal = await this.deals.openFromAcceptedApplication({
          applicationId,
          listingId: listing.id,
          ownerUserId: listing.ownerUserId,
          counterpartyUserId: application.applicantUserId,
          applicationType: application.type,
          amountMinor,
          currency: application.currency,
          startsAt: application.proposedMoveInAt,
          commissionBps: input.commissionBps ?? null,
        });
        dealId = deal.id;

        await this.db
          .update(listingApplications)
          .set({
            status: ApplicationStatus.REJECTED,
            decisionReason: 'Another application was accepted for this listing',
            decidedByUserId: ownerUserId,
            decidedAt: new Date(),
          })
          .where(
            and(
              eq(listingApplications.listingId, listing.id),
              ne(listingApplications.id, applicationId),
              inArray(listingApplications.status, [
                ...ACTIVE_APPLICATION_STATUSES,
              ]),
            ),
          );
      }

      const decisionType =
        input.status === ApplicationStatus.ACCEPTED
          ? NotificationType.APPLICATION_ACCEPTED
          : NotificationType.APPLICATION_REJECTED;
      this.notifications.notify({
        userId: application.applicantUserId,
        type: decisionType,
        title:
          input.status === ApplicationStatus.ACCEPTED
            ? 'Application accepted'
            : 'Application rejected',
        body:
          input.status === ApplicationStatus.ACCEPTED
            ? `Your application for "${listing.title}" was accepted.`
            : `Your application for "${listing.title}" was rejected${input.decisionReason ? `: ${input.decisionReason.trim()}` : '.'}`,
        entityType: NotificationEntityType.APPLICATION,
        entityId: applicationId,
        resources: {
          applicationId,
          listingId: listing.id,
          listingTitle: listing.title,
          paymentId: application.paymentId,
          dealId,
          actorUserId: ownerUserId,
        },
      });

      return {
        ...(await this.getById(applicationId)),
        dealId: dealId ?? null,
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to decide application', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async withdraw(applicationId: string, applicantUserId: string) {
    try {
      const application = await this.getById(applicationId);
      if (application.applicantUserId !== applicantUserId) {
        throw AppException.forbidden('You cannot withdraw this application');
      }
      if (
        application.status !== ApplicationStatus.SUBMITTED &&
        application.status !== ApplicationStatus.UNDER_REVIEW
      ) {
        throw AppException.badRequest(
          'Only active applications can be withdrawn',
        );
      }

      await this.db
        .update(listingApplications)
        .set({ status: ApplicationStatus.WITHDRAWN })
        .where(eq(listingApplications.id, applicationId));

      return this.getById(applicationId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to withdraw application', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getById(id: string) {
    const row = await this.db.query.listingApplications.findFirst({
      where: eq(listingApplications.id, id),
    });
    if (!row) {
      throw AppException.notFound(`Application ${id} not found`);
    }
    return row;
  }

  private assertTypeMatchesListing(
    type: ApplicationType,
    listingType: ListingType,
  ): void {
    if (
      type === ApplicationType.RENTAL_APPLICATION &&
      listingType !== ListingType.RENT
    ) {
      throw AppException.badRequest(
        'RENTAL_APPLICATION is only valid for RENT listings',
      );
    }
    if (
      type === ApplicationType.PURCHASE_OFFER &&
      listingType !== ListingType.SALE
    ) {
      throw AppException.badRequest(
        'PURCHASE_OFFER is only valid for SALE listings',
      );
    }
  }
}
