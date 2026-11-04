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
import { DealStatus, DealType } from '@mykwatta/modules/deals/constants';
import { listingApplications } from './applications.schema';
import { user } from './auth.schema';
import { currencyCodeEnum, listings } from './listings.schema';

export const dealTypeEnum = pgEnum(
  'deal_type',
  Object.values(DealType) as [DealType, ...DealType[]],
);

export const dealStatusEnum = pgEnum(
  'deal_status',
  Object.values(DealStatus) as [DealStatus, ...DealStatus[]],
);

/**
 * Post-acceptance deal: LEASE (rent) or SALE_AGREEMENT (sale).
 * Created when an application is ACCEPTED; listing moves to UNDER_CONTRACT.
 */
export const listingDeals = pgTable(
  'listing_deals',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    applicationId: text('application_id')
      .notNull()
      .references(() => listingApplications.id, { onDelete: 'restrict' }),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    counterpartyUserId: text('counterparty_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: dealTypeEnum('type').notNull(),
    status: dealStatusEnum('status').notNull().default(DealStatus.ACTIVE),
    /** Agreed amount (rent or sale price) in minor units. */
    amountMinor: integer('amount_minor').notNull(),
    /** Agency commission in basis points (100 bps = 1%). */
    commissionBps: integer('commission_bps'),
    currency: currencyCodeEnum('currency').notNull().default(CurrencyCode.XAF),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    notes: text('notes'),
    cancelledReason: text('cancelled_reason'),
    activatedAt: timestamp('activated_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('listing_deals_application_uidx').on(table.applicationId),
    index('listing_deals_listing_idx').on(table.listingId),
    index('listing_deals_owner_idx').on(table.ownerUserId),
    index('listing_deals_counterparty_idx').on(table.counterpartyUserId),
    index('listing_deals_status_idx').on(table.status),
  ],
);
