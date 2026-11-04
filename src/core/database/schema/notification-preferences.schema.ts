import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  NotificationChannelPreferences,
  NotificationTypePreferences,
} from '@mykwatta/modules/notifications/constants';
import { user } from './auth.schema';

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /**
     * Master channel consent:
     * PUSH | IN_APP | WHATSAPP | EMAIL | SMS
     */
    channels: jsonb('channels')
      .$type<NotificationChannelPreferences>()
      .notNull(),
    /** Per `NotificationType` toggle. `false` skips all channels for that type. */
    types: jsonb('types').$type<NotificationTypePreferences>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_preferences_user_uidx').on(table.userId),
  ],
);
