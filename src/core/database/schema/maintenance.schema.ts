import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { MaintenanceTicketStatus } from '@mykwatta/modules/maintenance/constants';
import { user } from './auth.schema';
import { listings } from './listings.schema';

export const maintenanceTicketStatusEnum = pgEnum(
  'maintenance_ticket_status',
  Object.values(MaintenanceTicketStatus) as [
    MaintenanceTicketStatus,
    ...MaintenanceTicketStatus[],
  ],
);

export const maintenanceTickets = pgTable(
  'maintenance_tickets',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    status: maintenanceTicketStatusEnum('status')
      .notNull()
      .default(MaintenanceTicketStatus.OPEN),
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('maintenance_tickets_listing_idx').on(table.listingId),
    index('maintenance_tickets_created_by_idx').on(table.createdByUserId),
    index('maintenance_tickets_assigned_to_idx').on(table.assignedToUserId),
    index('maintenance_tickets_status_idx').on(table.status),
  ],
);
