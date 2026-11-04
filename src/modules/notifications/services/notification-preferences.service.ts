import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { DRIZZLE } from '@mykwatta/core/database';
import type { DrizzleDb } from '@mykwatta/core/database';
import { notificationPreferences } from '@mykwatta/core/database/schema/notification-preferences.schema';
import {
  allowsNotificationDelivery,
  defaultNotificationChannelPreferences,
  defaultNotificationPreferences,
  defaultNotificationTypePreferences,
  mergeNotificationChannelPreferences,
  mergeNotificationTypePreferences,
  NotificationChannel,
  type NotificationChannelPreferences,
  type NotificationPreferencesView,
  type NotificationType,
  type NotificationTypePreferences,
} from '@mykwatta/modules/notifications/constants';

@Injectable()
export class NotificationPreferencesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getMine(userId: string): Promise<NotificationPreferencesView> {
    try {
      const row = await this.findRow(userId);
      if (!row) {
        return defaultNotificationPreferences();
      }
      return this.toView(row.channels, row.types);
    } catch (error) {
      throw AppException.database('Failed to load notification preferences', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async updateMine(
    userId: string,
    patch: {
      channels?: Partial<Record<NotificationChannel, boolean>>;
      types?: Partial<Record<NotificationType, boolean>>;
    },
  ): Promise<NotificationPreferencesView> {
    try {
      const current = await this.ensureRow(userId);
      const channels = patch.channels
        ? mergeNotificationChannelPreferences(current.channels, patch.channels)
        : current.channels;
      const types = patch.types
        ? mergeNotificationTypePreferences(current.types, patch.types)
        : current.types;

      const [updated] = await this.db
        .update(notificationPreferences)
        .set({
          channels,
          types,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))
        .returning();

      return this.toView(updated.channels, updated.types);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw AppException.database('Failed to update notification preferences', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async setChannelEnabled(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreferencesView> {
    return this.updateMine(userId, { channels: { [channel]: enabled } });
  }

  /** Used by notify() / email / future WhatsApp+SMS: defaults if never saved. */
  async resolveForDelivery(
    userId: string,
  ): Promise<NotificationPreferencesView> {
    return this.getMine(userId);
  }

  allows(
    prefs: NotificationPreferencesView,
    type: NotificationType,
    channel: NotificationChannel,
  ): boolean {
    return allowsNotificationDelivery(prefs, type, channel);
  }

  async allowsDelivery(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const prefs = await this.resolveForDelivery(userId);
    return this.allows(prefs, type, channel);
  }

  private async findRow(userId: string) {
    return this.db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
  }

  private async ensureRow(userId: string) {
    const existing = await this.findRow(userId);
    if (existing) {
      return {
        channels: this.normalizeChannels(existing.channels),
        types: this.normalizeTypes(existing.types),
      };
    }

    const defaults = defaultNotificationPreferences();
    const [created] = await this.db
      .insert(notificationPreferences)
      .values({
        id: createId(),
        userId,
        channels: defaults.channels,
        types: defaults.types,
      })
      .returning();

    return {
      channels: this.normalizeChannels(created.channels),
      types: this.normalizeTypes(created.types),
    };
  }

  private toView(
    channels: NotificationChannelPreferences,
    types: NotificationTypePreferences,
  ): NotificationPreferencesView {
    return {
      channels: this.normalizeChannels(channels),
      types: this.normalizeTypes(types),
    };
  }

  private normalizeChannels(
    channels: NotificationChannelPreferences | Record<string, boolean>,
  ): NotificationChannelPreferences {
    // Migrate legacy `{ pushEnabled }` / partial rows forward.
    const legacyPush =
      typeof (channels as { PUSH?: boolean }).PUSH === 'boolean'
        ? (channels as { PUSH: boolean }).PUSH
        : typeof (channels as { pushEnabled?: boolean }).pushEnabled ===
            'boolean'
          ? (channels as { pushEnabled: boolean }).pushEnabled
          : undefined;

    return {
      ...defaultNotificationChannelPreferences(),
      ...channels,
      ...(legacyPush !== undefined
        ? { [NotificationChannel.PUSH]: legacyPush }
        : {}),
    };
  }

  private normalizeTypes(
    types: NotificationTypePreferences,
  ): NotificationTypePreferences {
    return {
      ...defaultNotificationTypePreferences(),
      ...types,
    };
  }
}
