import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { EscrowStatus } from '@mykwatta/modules/escrow/constants';
import { user } from './auth.schema';
import { currencyCodeEnum, listings } from './listings.schema';
import { payments } from './payments.schema';

export const escrowStatusEnum = pgEnum(
  'escrow_status',
  Object.values(EscrowStatus) as [EscrowStatus, ...EscrowStatus[]],
);

export const escrowLedger = pgTable(
  'escrow_ledger',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    listingId: text('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    payerUserId: text('payer_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    beneficiaryUserId: text('beneficiary_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    amountMinor: integer('amount_minor').notNull(),
    currency: currencyCodeEnum('currency').notNull(),
    status: escrowStatusEnum('status').notNull().default(EscrowStatus.HELD),
    heldAt: timestamp('held_at').defaultNow().notNull(),
    releasedAt: timestamp('released_at'),
    refundedAt: timestamp('refunded_at'),
    releaseReason: text('release_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('escrow_ledger_payment_uidx').on(table.paymentId),
    index('escrow_ledger_payer_idx').on(table.payerUserId),
    index('escrow_ledger_beneficiary_idx').on(table.beneficiaryUserId),
    index('escrow_ledger_listing_idx').on(table.listingId),
    index('escrow_ledger_status_idx').on(table.status),
  ],
);
