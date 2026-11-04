import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { ListingReportStatus } from '@mykwatta/modules/listings/constants';
import { user } from './auth.schema';
import { listings } from './listings.schema';

export const listingReportStatusEnum = pgEnum(
  'listing_report_status',
  Object.values(ListingReportStatus) as [
    ListingReportStatus,
    ...ListingReportStatus[],
  ],
);

export const listingReports = pgTable(
  'listing_reports',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    reporterUserId: text('reporter_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    details: text('details'),
    status: listingReportStatusEnum('status')
      .notNull()
      .default(ListingReportStatus.OPEN),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listing_reports_listing_idx').on(table.listingId),
    index('listing_reports_reporter_idx').on(table.reporterUserId),
    index('listing_reports_status_idx').on(table.status),
  ],
);
