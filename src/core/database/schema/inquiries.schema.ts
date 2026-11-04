import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { InquiryStatus } from '@mykwatta/modules/listings/constants';
import { user } from './auth.schema';
import { listings } from './listings.schema';

export const inquiryStatusEnum = pgEnum(
  'inquiry_status',
  Object.values(InquiryStatus) as [InquiryStatus, ...InquiryStatus[]],
);

export const listingInquiries = pgTable(
  'listing_inquiries',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    inquirerUserId: text('inquirer_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    contactPhone: text('contact_phone'),
    status: inquiryStatusEnum('status').notNull().default(InquiryStatus.OPEN),
    responseMessage: text('response_message'),
    respondedAt: timestamp('responded_at'),
    closedAt: timestamp('closed_at'),
    assigneeUserId: text('assignee_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at'),
    slaDueAt: timestamp('sla_due_at'),
    firstRespondedAt: timestamp('first_responded_at'),
    slaBreachNotifiedAt: timestamp('sla_breach_notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listing_inquiries_listing_idx').on(table.listingId),
    index('listing_inquiries_inquirer_idx').on(table.inquirerUserId),
    index('listing_inquiries_status_idx').on(table.status),
    index('listing_inquiries_assignee_idx').on(table.assigneeUserId),
    index('listing_inquiries_sla_due_idx').on(table.slaDueAt),
  ],
);
