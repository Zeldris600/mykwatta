import { NotificationChannel } from './notification-channel';
import { NotificationType } from './notification-type';
import {
  allowsNotificationDelivery,
  type NotificationPreferencesView,
} from './notification-preferences';

/**
 * How loudly we should interrupt the user outside the app.
 *
 * - QUIET: in-app (+ push if available). No WhatsApp/email/SMS.
 * - NORMAL: in-app + push; WhatsApp only if they have no push devices.
 * - HIGH: in-app + push + WhatsApp (money/time decisions).
 * - CRITICAL: same as HIGH, plus email/SMS only as last-resort fallbacks.
 */
export enum NotificationUrgency {
  QUIET = 'QUIET',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export type DeliveryCapabilities = {
  hasPushDevices: boolean;
  hasWhatsappTarget: boolean;
  hasEmailTarget: boolean;
  hasSmsTarget: boolean;
};

export type DeliveryPlan = {
  urgency: NotificationUrgency;
  channels: NotificationChannel[];
};

export function urgencyForNotificationType(
  type: NotificationType,
): NotificationUrgency {
  switch (type) {
    case NotificationType.PAYMENT_FAILED:
      return NotificationUrgency.CRITICAL;

    case NotificationType.PAYMENT_SUCCEEDED:
    case NotificationType.APPOINTMENT_REQUESTED:
    case NotificationType.APPOINTMENT_CONFIRMED:
    case NotificationType.APPOINTMENT_DECLINED:
    case NotificationType.APPOINTMENT_CANCELLED:
    case NotificationType.APPLICATION_SUBMITTED:
    case NotificationType.APPLICATION_ACCEPTED:
    case NotificationType.APPLICATION_REJECTED:
    case NotificationType.DEAL_COMPLETED:
    case NotificationType.DEAL_CANCELLED:
    case NotificationType.RENT_REMINDER:
    case NotificationType.LEASE_RENEWAL_NOTICE:
    case NotificationType.LEAD_SLA_BREACH:
      return NotificationUrgency.HIGH;

    case NotificationType.MAINTENANCE_TICKET_CREATED:
    case NotificationType.MAINTENANCE_TICKET_ASSIGNED:
    case NotificationType.MAINTENANCE_TICKET_STATUS_CHANGED:
    case NotificationType.VENDOR_LEAD_SENT:
      return NotificationUrgency.NORMAL;

    case NotificationType.INQUIRY_CREATED:
    case NotificationType.INQUIRY_RESPONDED:
    case NotificationType.SAVED_SEARCH_MATCH:
    case NotificationType.FEED_COMMENT_ON_YOUR_LISTING:
    case NotificationType.FEED_COMMENT_REPLY:
      return NotificationUrgency.NORMAL;

    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

/**
 * Channel picker.
 *
 * Prefs = hard consent gate.
 * Product policy then picks a small set — we do **not** fan out to every
 * enabled channel. Primary stack is IN_APP + PUSH + WHATSAPP.
 *
 * Rules (after prefs):
 * 1. IN_APP — always when allowed (history + realtime).
 * 2. PUSH — when allowed and devices exist.
 * 3. WHATSAPP — HIGH/CRITICAL always (if allowed + phone);
 *    NORMAL only as fallback when there are no push devices.
 * 4. EMAIL — CRITICAL only, and only if WhatsApp cannot be used.
 * 5. SMS — CRITICAL only, and only if WhatsApp + email cannot be used.
 */
export function resolveDeliveryChannels(
  type: NotificationType,
  prefs: NotificationPreferencesView,
  caps: DeliveryCapabilities,
): DeliveryPlan {
  const urgency = urgencyForNotificationType(type);
  const allowed = (channel: NotificationChannel) =>
    allowsNotificationDelivery(prefs, type, channel);

  const channels: NotificationChannel[] = [];

  if (allowed(NotificationChannel.IN_APP)) {
    channels.push(NotificationChannel.IN_APP);
  }

  const pushReady = allowed(NotificationChannel.PUSH) && caps.hasPushDevices;
  if (pushReady) {
    channels.push(NotificationChannel.PUSH);
  }

  const whatsappReady =
    allowed(NotificationChannel.WHATSAPP) && caps.hasWhatsappTarget;
  const emailReady = allowed(NotificationChannel.EMAIL) && caps.hasEmailTarget;
  const smsReady = allowed(NotificationChannel.SMS) && caps.hasSmsTarget;

  const wantsWhatsapp =
    urgency === NotificationUrgency.HIGH ||
    urgency === NotificationUrgency.CRITICAL ||
    (urgency === NotificationUrgency.NORMAL && !pushReady);

  if (wantsWhatsapp && whatsappReady) {
    channels.push(NotificationChannel.WHATSAPP);
  }

  // Last-resort digests for critical money issues when WhatsApp is off/unreachable.
  if (urgency === NotificationUrgency.CRITICAL && !whatsappReady) {
    if (emailReady) {
      channels.push(NotificationChannel.EMAIL);
    } else if (smsReady) {
      channels.push(NotificationChannel.SMS);
    }
  }

  return { urgency, channels };
}

export function planIncludes(
  plan: DeliveryPlan,
  channel: NotificationChannel,
): boolean {
  return plan.channels.includes(channel);
}
