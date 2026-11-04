import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import {
  NotificationEntityType,
  NotificationType,
} from '@mykwatta/modules/notifications/constants';
import type { NotificationMetadata } from '@mykwatta/modules/notifications/constants';
import { user } from './auth.schema';

export const notificationTypeEnum = pgEnum(
  'notification_type',
  Object.values(NotificationType) as [NotificationType, ...NotificationType[]],
);

export const notificationEntityTypeEnum = pgEnum(
  'notification_entity_type',
  Object.values(NotificationEntityType) as [
    NotificationEntityType,
    ...NotificationEntityType[],
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    entityType: notificationEntityTypeEnum('entity_type'),
    entityId: text('entity_id'),
    /** Deep-link context for in-app / push clients (`href` + resource ids). */
    metadata: jsonb('metadata').$type<NotificationMetadata>().notNull(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_user_unread_idx').on(table.userId, table.readAt),
    index('notifications_created_idx').on(table.createdAt),
  ],
);
