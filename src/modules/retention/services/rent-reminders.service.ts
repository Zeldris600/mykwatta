import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingDeals } from '@mykwatta/core/database/schema/deals.schema';
import { listings } from '@mykwatta/core/database/schema/listings.schema';
import {
  rentScheduleItems,
  rentSchedules,
} from '@mykwatta/core/database/schema/rent-schedules.schema';
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';
import { RentScheduleItemStatus } from '@mykwatta/modules/rent-schedules/constants';
import {
  NotificationEntityType,
  NotificationType,
  NotificationsService,
} from '@mykwatta/modules/notifications';

const REMINDER_LOOKAHEAD_DAYS = 3;

@Injectable()
export class RentRemindersService {
  private readonly logger = new Logger(RentRemindersService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly notifications: NotificationsService,
  ) {}

  async runDaily(): Promise<{ rentRemindersSent: number; renewalNoticesSent: number }> {
    const rentRemindersSent = await this.sendUpcomingRentReminders();
    const renewalNoticesSent = await this.sendRenewalNotices();
    this.logger.log(
      `Rent retention job: reminders=${rentRemindersSent} renewals=${renewalNoticesSent}`,
    );
    return { rentRemindersSent, renewalNoticesSent };
  }

  async countRemindersSentLast7Days(): Promise<number> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 7);
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(rentScheduleItems)
      .where(gte(rentScheduleItems.reminderSentAt, since));
    return Number(row?.value ?? 0);
  }

  private async sendUpcomingRentReminders(): Promise<number> {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + REMINDER_LOOKAHEAD_DAYS);

    const dueItems = await this.db
      .select({
        item: rentScheduleItems,
        schedule: rentSchedules,
        listingTitle: listings.title,
      })
      .from(rentScheduleItems)
      .innerJoin(rentSchedules, eq(rentScheduleItems.scheduleId, rentSchedules.id))
      .innerJoin(listings, eq(rentSchedules.listingId, listings.id))
      .where(
        and(
          eq(rentScheduleItems.status, RentScheduleItemStatus.PENDING),
          isNull(rentScheduleItems.reminderSentAt),
          gte(rentScheduleItems.dueAt, now),
          lte(rentScheduleItems.dueAt, horizon),
        ),
      );

    let sent = 0;
    for (const row of dueItems) {
      const amountLabel = `${row.item.amountMinor.toLocaleString('en-US')} ${row.schedule.currency}`;
      const dueLabel = row.item.dueAt.toISOString().slice(0, 10);

      this.notifications.notify({
        userId: row.schedule.tenantUserId,
        type: NotificationType.RENT_REMINDER,
        title: 'Rent due soon',
        body: `Rent of ${amountLabel} for "${row.listingTitle}" is due on ${dueLabel}.`,
        entityType: NotificationEntityType.RENT_SCHEDULE,
        entityId: row.schedule.id,
        resources: {
          rentScheduleItemId: row.item.id,
          listingId: row.schedule.listingId,
          listingTitle: row.listingTitle,
          dealId: row.schedule.dealId,
        },
      });

      await this.db
        .update(rentScheduleItems)
        .set({ reminderSentAt: new Date() })
        .where(eq(rentScheduleItems.id, row.item.id));
      sent += 1;
    }

    return sent;
  }

  private async sendRenewalNotices(): Promise<number> {
    const now = new Date();
    const in30 = new Date(now);
    in30.setUTCDate(in30.getUTCDate() + 30);

    const deals = await this.db
      .select({
        deal: listingDeals,
        listingTitle: listings.title,
      })
      .from(listingDeals)
      .innerJoin(listings, eq(listingDeals.listingId, listings.id))
      .where(
        and(
          eq(listingDeals.type, DealType.LEASE),
          eq(listingDeals.status, DealStatus.ACTIVE),
          sql`${listingDeals.endsAt} is not null`,
          gte(listingDeals.endsAt, now),
          lte(listingDeals.endsAt, in30),
        ),
      );

    let sent = 0;
    for (const row of deals) {
      const endLabel = row.deal.endsAt?.toISOString().slice(0, 10) ?? '';
      for (const userId of [row.deal.ownerUserId, row.deal.counterpartyUserId]) {
        this.notifications.notify({
          userId,
          type: NotificationType.LEASE_RENEWAL_NOTICE,
          title: 'Lease renewal window',
          body: `Lease for "${row.listingTitle}" ends on ${endLabel}. Plan renewal or move-out.`,
          entityType: NotificationEntityType.DEAL,
          entityId: row.deal.id,
          resources: {
            dealId: row.deal.id,
            listingId: row.deal.listingId,
            listingTitle: row.listingTitle,
          },
        });
        sent += 1;
      }
    }

    return sent;
  }
}
