import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { InquiryMessageChannel } from '@mykwatta/modules/listings/constants';
import { user } from './auth.schema';
import { listingInquiries } from './inquiries.schema';

export const inquiryMessageChannelEnum = pgEnum(
  'inquiry_message_channel',
  Object.values(InquiryMessageChannel) as [
    InquiryMessageChannel,
    ...InquiryMessageChannel[],
  ],
);

export const listingInquiryMessages = pgTable(
  'listing_inquiry_messages',
  {
    id: text('id').primaryKey(),
    inquiryId: text('inquiry_id')
      .notNull()
      .references(() => listingInquiries.id, { onDelete: 'cascade' }),
    senderUserId: text('sender_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    channel: inquiryMessageChannelEnum('channel').notNull(),
    body: text('body').notNull(),
    externalMessageId: text('external_message_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('listing_inquiry_messages_inquiry_idx').on(table.inquiryId),
    uniqueIndex('listing_inquiry_messages_external_uidx').on(
      table.externalMessageId,
    ),
  ],
);
