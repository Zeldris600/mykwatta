import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  VendorCategory,
  VendorLeadStatus,
} from '@mykwatta/modules/vendors/constants';
import { user } from './auth.schema';
import { listings } from './listings.schema';
import { maintenanceTickets } from './maintenance.schema';
import { payments } from './payments.schema';

export const vendorCategoryEnum = pgEnum(
  'vendor_category',
  Object.values(VendorCategory) as [VendorCategory, ...VendorCategory[]],
);

export const vendorLeadStatusEnum = pgEnum(
  'vendor_lead_status',
  Object.values(VendorLeadStatus) as [
    VendorLeadStatus,
    ...VendorLeadStatus[],
  ],
);

export const vendors = pgTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    category: vendorCategoryEnum('category').notNull(),
    city: text('city').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('vendors_category_idx').on(table.category),
    index('vendors_city_idx').on(table.city),
    index('vendors_active_idx').on(table.active),
  ],
);

export const vendorLeads = pgTable(
  'vendor_leads',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    requesterUserId: text('requester_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    listingId: text('listing_id').references(() => listings.id, {
      onDelete: 'set null',
    }),
    maintenanceTicketId: text('maintenance_ticket_id').references(
      () => maintenanceTickets.id,
      { onDelete: 'set null' },
    ),
    status: vendorLeadStatusEnum('status')
      .notNull()
      .default(VendorLeadStatus.REQUESTED),
    paymentId: text('payment_id').references(() => payments.id, {
      onDelete: 'set null',
    }),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('vendor_leads_vendor_idx').on(table.vendorId),
    index('vendor_leads_requester_idx').on(table.requesterUserId),
    index('vendor_leads_status_idx').on(table.status),
  ],
);
