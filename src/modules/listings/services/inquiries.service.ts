import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { ApiConfigService } from '@mykwatta/core/config';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { listingInquiryMessages } from '@mykwatta/core/database/schema/inquiry-messages.schema';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  InquiryMessageChannel,
  InquiryStatus,
  ListingStatus,
  leadSlaDueAt,
} from '@mykwatta/modules/listings/constants';
import { buildWhatsappContinueUrl } from '@mykwatta/shared/twilio/whatsapp-url.util';
import type {
  CreateInquiryDto,
  RespondInquiryDto,
} from '@mykwatta/modules/listings/dto';
import { ListingsService } from '@mykwatta/modules/listings/services/listings.service';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly listingsService: ListingsService,
    private readonly config: ApiConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    listingId: string,
    inquirerUserId: string,
    input: CreateInquiryDto,
  ) {
    try {
      const listing = await this.listingsService.getById(listingId);
      if (listing.status !== ListingStatus.PUBLISHED) {
        throw AppException.notFound(`Listing ${listingId} not found`);
      }
      if (listing.ownerUserId === inquirerUserId) {
        throw AppException.forbidden(
          'You cannot inquire about your own listing',
        );
      }

      const openExisting = await this.db.query.listingInquiries.findFirst({
        where: and(
          eq(listingInquiries.listingId, listingId),
          eq(listingInquiries.inquirerUserId, inquirerUserId),
          eq(listingInquiries.status, InquiryStatus.OPEN),
        ),
      });
      if (openExisting) {
        throw AppException.conflict(
          'You already have an open inquiry on this listing',
        );
      }

      const id = createId();
      const trimmedMessage = input.message.trim();
      await this.db.insert(listingInquiries).values({
        id,
        listingId,
        inquirerUserId,
        message: trimmedMessage,
        contactPhone: input.contactPhone?.trim() || null,
        status: InquiryStatus.OPEN,
        slaDueAt: leadSlaDueAt(),
      });

      await this.db.insert(listingInquiryMessages).values({
        id: createId(),
        inquiryId: id,
        senderUserId: inquirerUserId,
        channel: InquiryMessageChannel.IN_APP,
        body: trimmedMessage,
      });

      await this.notifyOwner(listing, inquirerUserId, trimmedMessage, id);

      const owner = await this.db.query.user.findFirst({
        where: eq(userTable.id, listing.ownerUserId),
      });
      const inquiry = await this.getById(id);
      const whatsappContinueUrl = buildWhatsappContinueUrl(
        owner?.phoneNumber,
        listing.title,
        listing.id,
        this.config.whatsappContinueBaseUrl,
      );

      return { ...inquiry, whatsappContinueUrl };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `create inquiry failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.database('Failed to create inquiry', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listForListing(listingId: string, requesterUserId: string) {
    try {
      await this.listingsService.assertUserCanManage(
        listingId,
        requesterUserId,
      );
      return await this.db.query.listingInquiries.findMany({
        where: eq(listingInquiries.listingId, listingId),
        orderBy: [desc(listingInquiries.createdAt)],
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to list listing inquiries', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listMine(inquirerUserId: string) {
    try {
      return await this.db.query.listingInquiries.findMany({
        where: eq(listingInquiries.inquirerUserId, inquirerUserId),
        orderBy: [desc(listingInquiries.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list my inquiries', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listInbox(ownerUserId: string) {
    try {
      const owned = await this.db.query.listings.findMany({
        where: eq(listings.ownerUserId, ownerUserId),
        columns: { id: true },
      });
      const listingIds = owned.map((row) => row.id);
      if (listingIds.length === 0) {
        return [];
      }

      return await this.db.query.listingInquiries.findMany({
        where: inArray(listingInquiries.listingId, listingIds),
        orderBy: [desc(listingInquiries.createdAt)],
      });
    } catch (error) {
      throw AppException.database('Failed to list inquiry inbox', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async respond(
    inquiryId: string,
    responderUserId: string,
    input: RespondInquiryDto,
  ) {
    try {
      const inquiry = await this.getById(inquiryId);
      await this.listingsService.assertUserCanManage(
        inquiry.listingId,
        responderUserId,
      );

      if (inquiry.status === InquiryStatus.CLOSED) {
        throw AppException.badRequest(
          'Closed inquiries cannot be responded to',
        );
      }

      await this.db
        .update(listingInquiries)
        .set({
          status: InquiryStatus.RESPONDED,
          responseMessage: input.responseMessage.trim(),
          respondedAt: new Date(),
          firstRespondedAt: inquiry.firstRespondedAt ?? new Date(),
        })
        .where(eq(listingInquiries.id, inquiryId));

      await this.notifyInquirer(
        inquiry.inquirerUserId,
        inquiry.listingId,
        input.responseMessage.trim(),
        inquiryId,
      );

      return this.getById(inquiryId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to respond to inquiry', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async close(inquiryId: string, userId: string) {
    try {
      const inquiry = await this.getById(inquiryId);

      const isInquirer = inquiry.inquirerUserId === userId;
      if (!isInquirer) {
        await this.listingsService.assertUserCanManage(
          inquiry.listingId,
          userId,
        );
      }

      if (inquiry.status === InquiryStatus.CLOSED) {
        return inquiry;
      }

      await this.db
        .update(listingInquiries)
        .set({
          status: InquiryStatus.CLOSED,
          closedAt: new Date(),
        })
        .where(eq(listingInquiries.id, inquiryId));

      return this.getById(inquiryId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to close inquiry', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getById(id: string) {
    const inquiry = await this.db.query.listingInquiries.findFirst({
      where: eq(listingInquiries.id, id),
    });
    if (!inquiry) {
      throw AppException.notFound(`Inquiry ${id} not found`);
    }
    return inquiry;
  }

  /** Inquirer or listing manager. */
  async assertParticipant(inquiryId: string, userId: string) {
    const inquiry = await this.getById(inquiryId);
    if (inquiry.inquirerUserId === userId) {
      return inquiry;
    }
    await this.listingsService.assertUserCanManage(inquiry.listingId, userId);
    return inquiry;
  }

  private async notifyOwner(
    listing: { id: string; title: string; ownerUserId: string },
    inquirerUserId: string,
    message: string,
    inquiryId: string,
  ): Promise<void> {
    const [inquirer, owner] = await Promise.all([
      this.db.query.user.findFirst({ where: eq(userTable.id, inquirerUserId) }),
      this.db.query.user.findFirst({
        where: eq(userTable.id, listing.ownerUserId),
      }),
    ]);
    const who = inquirer?.name ?? 'A user';
    const inboxUrl = `${this.config.appUrl}/inquiries/inbox`;

    this.notifications.notify({
      userId: listing.ownerUserId,
      type: NotificationType.INQUIRY_CREATED,
      title: 'New listing inquiry',
      body: `${who} inquired about "${listing.title}".`,
      entityType: NotificationEntityType.INQUIRY,
      entityId: inquiryId,
      resources: {
        listingId: listing.id,
        listingTitle: listing.title,
        inquiryId,
        actorUserId: inquirerUserId,
        actorName: who,
      },
      email: owner?.email
        ? {
            to: owner.email,
            subject: `New inquiry on "${listing.title}"`,
            text: [
              `${who} inquired about "${listing.title}".`,
              '',
              message,
              '',
              `Open inbox: ${inboxUrl}`,
            ].join('\n'),
            html: `<p><strong>${who}</strong> inquired about <strong>${listing.title}</strong>.</p><p>${message}</p><p><a href="${inboxUrl}">Open inbox</a></p>`,
          }
        : undefined,
    });
  }

  private async notifyInquirer(
    inquirerUserId: string,
    listingId: string,
    responseMessage: string,
    inquiryId: string,
  ): Promise<void> {
    const listing = await this.listingsService.getById(listingId);
    const inquirer = await this.db.query.user.findFirst({
      where: eq(userTable.id, inquirerUserId),
    });
    const mineUrl = `${this.config.appUrl}/inquiries/mine`;

    this.notifications.notify({
      userId: inquirerUserId,
      type: NotificationType.INQUIRY_RESPONDED,
      title: 'Inquiry reply',
      body: `You received a reply about "${listing.title}".`,
      entityType: NotificationEntityType.INQUIRY,
      entityId: inquiryId,
      resources: {
        listingId: listing.id,
        listingTitle: listing.title,
        inquiryId,
        actorUserId: listing.ownerUserId,
      },
      email: inquirer?.email
        ? {
            to: inquirer.email,
            subject: `Reply on "${listing.title}"`,
            text: [
              `You received a reply about "${listing.title}".`,
              '',
              responseMessage,
              '',
              `View inquiries: ${mineUrl}`,
            ].join('\n'),
            html: `<p>You received a reply about <strong>${listing.title}</strong>.</p><p>${responseMessage}</p><p><a href="${mineUrl}">View inquiries</a></p>`,
          }
        : undefined,
    });
  }
}
