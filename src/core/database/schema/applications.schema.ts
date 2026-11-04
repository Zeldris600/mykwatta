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
import {
  ApplicationStatus,
  ApplicationType,
} from '@mykwatta/modules/applications/constants';
import { user } from './auth.schema';
import { currencyCodeEnum, listings } from './listings.schema';
import { payments } from './payments.schema';

export const applicationTypeEnum = pgEnum(
  'application_type',
  Object.values(ApplicationType) as [ApplicationType, ...ApplicationType[]],
);

export const applicationStatusEnum = pgEnum(
  'application_status',
  Object.values(ApplicationStatus) as [
    ApplicationStatus,
    ...ApplicationStatus[],
  ],
);

/**
 * Rental application or purchase offer, backed by a succeeded listing deposit.
 */
export const listingApplications = pgTable(
  'listing_applications',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    applicantUserId: text('applicant_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    type: applicationTypeEnum('type').notNull(),
    status: applicationStatusEnum('status')
      .notNull()
      .default(ApplicationStatus.SUBMITTED),
    message: text('message').notNull(),
    offerAmountMinor: integer('offer_amount_minor'),
    currency: currencyCodeEnum('currency').notNull().default(CurrencyCode.XAF),
    proposedMoveInAt: timestamp('proposed_move_in_at'),
    decisionReason: text('decision_reason'),
    decidedByUserId: text('decided_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    decidedAt: timestamp('decided_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('listing_applications_payment_uidx').on(table.paymentId),
    index('listing_applications_listing_idx').on(table.listingId),
    index('listing_applications_applicant_idx').on(table.applicantUserId),
    index('listing_applications_status_idx').on(table.status),
  ],
);
