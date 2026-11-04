import {
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from './notification-channel';
import { NOTIFICATION_TYPES, NotificationType } from './notification-type';

/** Master channel toggles (push, in-app, WhatsApp, email, SMS). */
export type NotificationChannelPreferences = Record<
  NotificationChannel,
  boolean
>;

/** Per-type on/off — `false` skips every channel for that type. */
export type NotificationTypePreferences = Record<NotificationType, boolean>;

export type NotificationPreferencesView = {
  channels: NotificationChannelPreferences;
  types: NotificationTypePreferences;
};

export function defaultNotificationChannelPreferences(): NotificationChannelPreferences {
  return Object.fromEntries(
    NOTIFICATION_CHANNELS.map((channel) => [channel, true]),
  ) as NotificationChannelPreferences;
}

export function defaultNotificationTypePreferences(): NotificationTypePreferences {
  return Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [type, true]),
  ) as NotificationTypePreferences;
}

export function defaultNotificationPreferences(): NotificationPreferencesView {
  return {
    channels: defaultNotificationChannelPreferences(),
    types: defaultNotificationTypePreferences(),
  };
}

export function mergeNotificationChannelPreferences(
  current: NotificationChannelPreferences,
  patch: Partial<Record<NotificationChannel, boolean>>,
): NotificationChannelPreferences {
  const next = { ...current };
  for (const channel of NOTIFICATION_CHANNELS) {
    if (typeof patch[channel] === 'boolean') {
      next[channel] = patch[channel];
    }
  }
  return next;
}

export function mergeNotificationTypePreferences(
  current: NotificationTypePreferences,
  patch: Partial<Record<NotificationType, boolean>>,
): NotificationTypePreferences {
  const next = { ...current };
  for (const type of NOTIFICATION_TYPES) {
    if (typeof patch[type] === 'boolean') {
      next[type] = patch[type];
    }
  }
  return next;
}

export function isNotificationTypeEnabled(
  types: NotificationTypePreferences,
  type: NotificationType,
): boolean {
  return types[type] !== false;
}

export function isNotificationChannelEnabled(
  channels: NotificationChannelPreferences,
  channel: NotificationChannel,
): boolean {
  return channels[channel] !== false;
}

/** Type must be on and the specific channel must be on. */
export function allowsNotificationDelivery(
  prefs: NotificationPreferencesView,
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  return (
    isNotificationTypeEnabled(prefs.types, type) &&
    isNotificationChannelEnabled(prefs.channels, channel)
  );
}
