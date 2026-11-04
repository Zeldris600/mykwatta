import type {
  NotificationEntityType,
  NotificationResourceIds,
  NotificationType,
} from '@mykwatta/modules/notifications/constants';

/** Optional EMAIL channel payload (queued with the notification event). */
export type NotificationEmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Optional WHATSAPP / SMS channel payloads. */
export type NotificationMessagePayload = {
  to: string;
  body: string;
};

/**
 * Fire-and-forget notification event payload.
 * Callers enqueue this; the worker delivers preferred channels.
 */
export type DeliverNotificationJobData = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  resources?: NotificationResourceIds;
  email?: NotificationEmailPayload;
  whatsapp?: NotificationMessagePayload;
  sms?: NotificationMessagePayload;
};
