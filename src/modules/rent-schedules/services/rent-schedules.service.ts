import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { listingDeals } from '@mykwatta/core/database/schema/deals.schema';
import {
  rentScheduleItems,
  rentSchedules,
} from '@mykwatta/core/database/schema/rent-schedules.schema';
import type { CreateRentScheduleDto } from '@mykwatta/modules/rent-schedules/dto';
import { computeOccupancyPercentForOwner } from '@mykwatta/modules/rent-schedules/helpers/occupancy.helper';
import { RentScheduleItemStatus } from '@mykwatta/modules/rent-schedules/constants';
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';

const DEFAULT_LEASE_MONTHS = 12;

@Injectable()
export class RentSchedulesService {
  private readonly logger = new Logger(RentSchedulesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async createForDeal(
    dealId: string,
    ownerUserId: string,
    input: CreateRentScheduleDto = {},
  ) {
    const deal = await this.db.query.listingDeals.findFirst({
      where: eq(listingDeals.id, dealId),
    });
    if (!deal) {
      throw AppException.notFound(`Deal ${dealId} not found`);
    }
    if (deal.ownerUserId !== ownerUserId) {
      throw AppException.forbidden(
        'Only the deal owner can create rent schedules',
      );
    }
    if (deal.type !== DealType.LEASE || deal.status !== DealStatus.ACTIVE) {
      throw AppException.badRequest(
        'Rent schedule requires an active lease deal',
      );
    }

    const existing = await this.db.query.rentSchedules.findFirst({
      where: eq(rentSchedules.dealId, dealId),
      columns: { id: true },
    });
    if (existing) {
      return this.getSchedule(existing.id, ownerUserId);
    }

    const startsAt = deal.startsAt ?? deal.activatedAt ?? new Date();
    let endsAt = deal.endsAt;
    if (!endsAt) {
      endsAt = addMonths(startsAt, DEFAULT_LEASE_MONTHS);
      await this.db
        .update(listingDeals)
        .set({ endsAt, startsAt: deal.startsAt ?? startsAt })
        .where(eq(listingDeals.id, dealId));
    }

    const dayOfMonth =
      input.dayOfMonth ?? Math.min(28, startsAt.getUTCDate() || 1);
    const scheduleId = createId();

    await this.db.transaction(async (tx) => {
      await tx.insert(rentSchedules).values({
        id: scheduleId,
        dealId: deal.id,
        listingId: deal.listingId,
        ownerUserId: deal.ownerUserId,
        tenantUserId: deal.counterpartyUserId,
        amountMinor: deal.amountMinor,
        currency: deal.currency,
        dayOfMonth,
        startsAt,
        endsAt,
      });

      const items = buildMonthlyItems({
        scheduleId,
        amountMinor: deal.amountMinor,
        dayOfMonth,
        startsAt,
        endsAt,
      });
      if (items.length > 0) {
        await tx.insert(rentScheduleItems).values(items);
      }
    });

    this.logger.log(`Rent schedule ${scheduleId} created for deal ${dealId}`);
    return this.getSchedule(scheduleId, ownerUserId);
  }

  async getSchedule(scheduleId: string, userId: string) {
    const schedule = await this.db.query.rentSchedules.findFirst({
      where: eq(rentSchedules.id, scheduleId),
    });
    if (!schedule) {
      throw AppException.notFound(`Rent schedule ${scheduleId} not found`);
    }
    this.assertParticipant(userId, schedule.ownerUserId, schedule.tenantUserId);

    const items = await this.db.query.rentScheduleItems.findMany({
      where: eq(rentScheduleItems.scheduleId, scheduleId),
      orderBy: (fields, { asc }) => [asc(fields.dueAt)],
    });

    return { ...schedule, items };
  }

  async listForOwner(ownerUserId: string) {
    return this.db.query.rentSchedules.findMany({
      where: eq(rentSchedules.ownerUserId, ownerUserId),
    });
  }

  async occupancyForOwner(ownerUserId: string) {
    const percent = await computeOccupancyPercentForOwner(this.db, ownerUserId);
    return { occupancyPercent: percent };
  }

  async getScheduleItemForTenant(itemId: string, tenantUserId: string) {
    const item = await this.db.query.rentScheduleItems.findFirst({
      where: eq(rentScheduleItems.id, itemId),
    });
    if (!item) {
      throw AppException.notFound(`Rent schedule item ${itemId} not found`);
    }
    const schedule = await this.db.query.rentSchedules.findFirst({
      where: eq(rentSchedules.id, item.scheduleId),
    });
    if (!schedule || schedule.tenantUserId !== tenantUserId) {
      throw AppException.forbidden('Not allowed on this rent item');
    }
    return {
      amountMinor: item.amountMinor,
      currency: schedule.currency,
      scheduleId: schedule.id,
      listingId: schedule.listingId,
    };
  }

  async rentDueThisWeekForOwner(ownerUserId: string) {
    const { weekStart, weekEnd } = currentUtcWeekBounds();
    const rows = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        totalMinor: sql<number>`coalesce(sum(${rentScheduleItems.amountMinor}), 0)::int`,
      })
      .from(rentScheduleItems)
      .innerJoin(
        rentSchedules,
        eq(rentScheduleItems.scheduleId, rentSchedules.id),
      )
      .where(
        and(
          eq(rentSchedules.ownerUserId, ownerUserId),
          eq(rentScheduleItems.status, RentScheduleItemStatus.PENDING),
          gte(rentScheduleItems.dueAt, weekStart),
          lte(rentScheduleItems.dueAt, weekEnd),
        ),
      );

    return {
      rentDueThisWeekCount: Number(rows[0]?.count ?? 0),
      rentDueThisWeekMinor: Number(rows[0]?.totalMinor ?? 0),
    };
  }

  private assertParticipant(
    userId: string,
    ownerUserId: string,
    tenantUserId: string,
  ): void {
    if (userId === ownerUserId || userId === tenantUserId) {
      return;
    }
    throw AppException.forbidden('Not allowed on this rent schedule');
  }
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function buildMonthlyItems(input: {
  scheduleId: string;
  amountMinor: number;
  dayOfMonth: number;
  startsAt: Date;
  endsAt: Date;
}) {
  const items: (typeof rentScheduleItems.$inferInsert)[] = [];
  let cursor = new Date(input.startsAt);
  cursor.setUTCDate(input.dayOfMonth);
  if (cursor < input.startsAt) {
    cursor = addMonths(cursor, 1);
  }

  while (cursor <= input.endsAt && items.length < DEFAULT_LEASE_MONTHS) {
    items.push({
      id: createId(),
      scheduleId: input.scheduleId,
      dueAt: new Date(cursor),
      amountMinor: input.amountMinor,
      status: RentScheduleItemStatus.PENDING,
    });
    cursor = addMonths(cursor, 1);
  }

  return items;
}

function currentUtcWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return { weekStart, weekEnd };
}
