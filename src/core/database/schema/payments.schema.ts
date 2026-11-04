import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { CurrencyCode } from '@mykwatta/core/common/utils/money/currency';
import {
  PaymentChannel,
  PaymentProviderName,
  PaymentPurpose,
  PaymentStatus,
} from '@mykwatta/modules/payments/constants';
import { listingAppointments } from './appointments.schema';
import { user } from './auth.schema';
import { currencyCodeEnum, listings } from './listings.schema';

export const paymentStatusEnum = pgEnum(
  'payment_status',
  Object.values(PaymentStatus) as [PaymentStatus, ...PaymentStatus[]],
);

export const paymentProviderEnum = pgEnum(
  'payment_provider',
  Object.values(PaymentProviderName) as [
    PaymentProviderName,
    ...PaymentProviderName[],
  ],
);

export const paymentChannelEnum = pgEnum(
  'payment_channel',
  Object.values(PaymentChannel) as [PaymentChannel, ...PaymentChannel[]],
);

export const paymentPurposeEnum = pgEnum(
  'payment_purpose',
  Object.values(PaymentPurpose) as [PaymentPurpose, ...PaymentPurpose[]],
);

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    listingId: text('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    appointmentId: text('appointment_id').references(
      () => listingAppointments.id,
      { onDelete: 'set null' },
    ),
    purpose: paymentPurposeEnum('purpose').notNull(),
    channel: paymentChannelEnum('channel').notNull(),
    provider: paymentProviderEnum('provider').notNull(),
    status: paymentStatusEnum('status')
      .notNull()
      .default(PaymentStatus.PENDING),
    amountMinor: integer('amount_minor').notNull(),
    currency: currencyCodeEnum('currency').notNull().default(CurrencyCode.XAF),
    /** Provider transaction / PaymentIntent id. */
    providerRef: text('provider_ref'),
    checkoutUrl: text('checkout_url'),
    failureReason: text('failure_reason'),
    paidAt: timestamp('paid_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('payments_user_idx').on(table.userId),
    index('payments_listing_idx').on(table.listingId),
    index('payments_status_idx').on(table.status),
    index('payments_provider_ref_idx').on(table.providerRef),
  ],
);
