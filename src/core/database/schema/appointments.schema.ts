import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { AppointmentStatus } from '@mykwatta/modules/listings/constants';
import { AppointmentModality } from '@mykwatta/modules/listings/constants/appointment-modality';
import { user } from './auth.schema';
import { listingInquiries } from './inquiries.schema';
import { listings } from './listings.schema';

export const appointmentModalityEnum = pgEnum(
  'appointment_modality',
  Object.values(AppointmentModality) as [
    AppointmentModality,
    ...AppointmentModality[],
  ],
);

export const appointmentStatusEnum = pgEnum(
  'appointment_status',
  Object.values(AppointmentStatus) as [
    AppointmentStatus,
    ...AppointmentStatus[],
  ],
);

export const listingAppointments = pgTable(
  'listing_appointments',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    inquiryId: text('inquiry_id').references(() => listingInquiries.id, {
      onDelete: 'set null',
    }),
    requesterUserId: text('requester_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: appointmentStatusEnum('status')
      .notNull()
      .default(AppointmentStatus.REQUESTED),
    scheduledAt: timestamp('scheduled_at').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    modality: appointmentModalityEnum('modality')
      .notNull()
      .default(AppointmentModality.IN_PERSON),
    meetingUrl: text('meeting_url'),
    locationNote: text('location_note'),
    notes: text('notes'),
    declineReason: text('decline_reason'),
    confirmedAt: timestamp('confirmed_at'),
    cancelledAt: timestamp('cancelled_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listing_appointments_listing_idx').on(table.listingId),
    index('listing_appointments_inquiry_idx').on(table.inquiryId),
    index('listing_appointments_requester_idx').on(table.requesterUserId),
    index('listing_appointments_status_idx').on(table.status),
    index('listing_appointments_scheduled_idx').on(table.scheduledAt),
  ],
);
