import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, or } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { user as userTable } from '@mykwatta/core/database/schema/auth.schema';
import { listingInquiryMessages } from '@mykwatta/core/database/schema/inquiry-messages.schema';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  InquiryMessageChannel,
  InquiryStatus,
} from '@mykwatta/modules/listings/constants';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';
import { normalizeWhatsappDialNumber } from '@mykwatta/shared/twilio/whatsapp-url.util';

export type TwilioWhatsappInboundPayload = {
  Body?: string;
  From?: string;
  WaId?: string;
  MessageSid?: string;
};

@Injectable()
export class WhatsappInboundService {
  private readonly logger = new Logger(WhatsappInboundService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly notifications: NotificationsService,
  ) {}

  async handleInbound(payload: TwilioWhatsappInboundPayload): Promise<void> {
    const body = payload.Body?.trim();
    if (!body) {
      throw AppException.badRequest('WhatsApp message body is required');
    }

    const senderPhone = this.resolveSenderPhone(payload);
    const user = await this.findUserByPhone(senderPhone);
    if (!user) {
      this.logger.warn(
        `WhatsApp inbound from unknown phone ${senderPhone} — ignored`,
      );
      return;
    }

    const inquiry = await this.findLatestOpenInquiryForUser(user.id);
    if (!inquiry) {
      this.logger.warn(
        `WhatsApp inbound from user ${user.id} with no open inquiry — ignored`,
      );
      return;
    }

    const externalId = payload.MessageSid?.trim();
    if (externalId) {
      const existing = await this.db.query.listingInquiryMessages.findFirst({
        where: eq(listingInquiryMessages.externalMessageId, externalId),
      });
      if (existing) {
        return;
      }
    }

    const messageId = createId();
    await this.db.insert(listingInquiryMessages).values({
      id: messageId,
      inquiryId: inquiry.id,
      senderUserId: user.id,
      channel: InquiryMessageChannel.WHATSAPP,
      body,
      externalMessageId: externalId ?? null,
    });

    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, inquiry.listingId),
    });
    if (!listing) {
      return;
    }

    this.notifications.notify({
      userId: listing.ownerUserId,
      type: NotificationType.INQUIRY_CREATED,
      title: 'WhatsApp inquiry message',
      body: `${user.name ?? 'A user'} sent a WhatsApp message about "${listing.title}".`,
      entityType: NotificationEntityType.INQUIRY,
      entityId: inquiry.id,
      resources: {
        listingId: listing.id,
        listingTitle: listing.title,
        inquiryId: inquiry.id,
        actorUserId: user.id,
        actorName: user.name ?? undefined,
      },
    });
  }

  private resolveSenderPhone(payload: TwilioWhatsappInboundPayload): string {
    const raw = payload.WaId?.trim() || payload.From?.trim() || '';
    const withoutPrefix = raw.replace(/^whatsapp:/i, '');
    const digits = normalizeWhatsappDialNumber(withoutPrefix);
    if (!digits) {
      throw AppException.badRequest(
        'Could not resolve sender phone from webhook',
      );
    }
    return `+${digits}`;
  }

  private async findUserByPhone(phone: string) {
    const digits = normalizeWhatsappDialNumber(phone);
    const candidates = await this.db.query.user.findMany({
      where: or(
        eq(userTable.phoneNumber, phone),
        eq(userTable.phoneNumber, `+${digits}`),
      ),
      limit: 1,
    });
    return candidates[0] ?? null;
  }

  private async findLatestOpenInquiryForUser(userId: string) {
    return this.db.query.listingInquiries.findFirst({
      where: and(
        eq(listingInquiries.inquirerUserId, userId),
        eq(listingInquiries.status, InquiryStatus.OPEN),
      ),
      orderBy: [desc(listingInquiries.createdAt)],
    });
  }
}
