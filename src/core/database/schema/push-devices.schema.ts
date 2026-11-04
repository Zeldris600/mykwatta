import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { PushPlatform } from '@mykwatta/modules/notifications/constants';
import { user } from './auth.schema';

export const pushPlatformEnum = pgEnum(
  'push_platform',
  Object.values(PushPlatform) as [PushPlatform, ...PushPlatform[]],
);

export const pushDevices = pgTable(
  'push_devices',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    platform: pushPlatformEnum('platform').notNull(),
    token: text('token').notNull(),
    /** Optional stable client device id (re-register / rotate tokens). */
    deviceId: text('device_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('push_devices_token_uidx').on(table.token),
    index('push_devices_user_idx').on(table.userId),
    index('push_devices_user_platform_idx').on(table.userId, table.platform),
  ],
);
