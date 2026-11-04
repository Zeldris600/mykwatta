import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import { RentScheduleItemStatus } from '@mykwatta/modules/rent-schedules/constants';
import { listingDeals } from './deals.schema';
import { user } from './auth.schema';
import { currencyCodeEnum, listings } from './listings.schema';

export const rentScheduleItemStatusEnum = pgEnum(
  'rent_schedule_item_status',
  Object.values(RentScheduleItemStatus) as [
    RentScheduleItemStatus,
    ...RentScheduleItemStatus[],
  ],
);

export const rentSchedules = pgTable(
  'rent_schedules',
  {
    id: text('id').primaryKey(),
    dealId: text('deal_id')
      .notNull()
      .references(() => listingDeals.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tenantUserId: text('tenant_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    currency: currencyCodeEnum('currency').notNull().default(CurrencyCode.XAF),
    /** Day of month rent is due (1–28). */
    dayOfMonth: integer('day_of_month').notNull().default(1),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('rent_schedules_deal_uidx').on(table.dealId),
    index('rent_schedules_listing_idx').on(table.listingId),
    index('rent_schedules_owner_idx').on(table.ownerUserId),
    index('rent_schedules_tenant_idx').on(table.tenantUserId),
  ],
);

export const rentScheduleItems = pgTable(
  'rent_schedule_items',
  {
    id: text('id').primaryKey(),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => rentSchedules.id, { onDelete: 'cascade' }),
    dueAt: timestamp('due_at').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    status: rentScheduleItemStatusEnum('status')
      .notNull()
      .default(RentScheduleItemStatus.PENDING),
    paidAt: timestamp('paid_at'),
    reminderSentAt: timestamp('reminder_sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('rent_schedule_items_schedule_idx').on(table.scheduleId),
    index('rent_schedule_items_due_at_idx').on(table.dueAt),
    index('rent_schedule_items_status_idx').on(table.status),
    index('rent_schedule_items_reminder_sent_idx').on(table.reminderSentAt),
  ],
);
