import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, lte } from 'drizzle-orm';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingInquiries } from '@mykwatta/core/database/schema/inquiries.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import { InquiryStatus } from '@mykwatta/modules/listings/constants';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

@Injectable()
export class LeadSlaService {
  private readonly logger = new Logger(LeadSlaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly notifications: NotificationsService,
  ) {}

  /** Notify assignee (or owner) once when an open lead misses its SLA. */
  async scanBreaches(): Promise<number> {
    const now = new Date();
    const rows = await this.db
      .select({
        id: listingInquiries.id,
        listingId: listingInquiries.listingId,
        assigneeUserId: listingInquiries.assigneeUserId,
        ownerUserId: listings.ownerUserId,
        title: listings.title,
      })
      .from(listingInquiries)
      .innerJoin(listings, eq(listingInquiries.listingId, listings.id))
      .where(
        and(
          eq(listingInquiries.status, InquiryStatus.OPEN),
          isNull(listingInquiries.firstRespondedAt),
          isNull(listingInquiries.slaBreachNotifiedAt),
          lte(listingInquiries.slaDueAt, now),
        ),
      )
      .limit(200);

    for (const row of rows) {
      const notifyUserId = row.assigneeUserId ?? row.ownerUserId;
      this.notifications.notify({
        userId: notifyUserId,
        type: NotificationType.LEAD_SLA_BREACH,
        title: 'Lead response overdue',
        body: `Inquiry on "${row.title}" passed its response deadline.`,
        entityType: NotificationEntityType.INQUIRY,
        entityId: row.id,
        resources: {
          listingId: row.listingId,
          listingTitle: row.title,
          inquiryId: row.id,
        },
      });
      await this.db
        .update(listingInquiries)
        .set({ slaBreachNotifiedAt: now })
        .where(eq(listingInquiries.id, row.id));
    }

    if (rows.length > 0) {
      this.logger.log(`SLA breach notifications sent=${rows.length}`);
    }
    return rows.length;
  }
}
