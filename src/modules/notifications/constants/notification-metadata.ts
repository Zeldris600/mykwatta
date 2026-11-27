import { NotificationType } from './notification-type';

/**
 * Structured payload for in-app + push clients.
 * Always includes `href` so the FE can navigate on tap.
 */
export type NotificationMetadata = {
  /** App-relative deep link, e.g. `/listings/:id/inquiries/:inquiryId`. */
  href: string;
  listingId?: string;
  listingTitle?: string;
  inquiryId?: string;
  appointmentId?: string;
  paymentId?: string;
  applicationId?: string;
  dealId?: string;
  maintenanceTicketId?: string;
  vendorLeadId?: string;
  rentScheduleItemId?: string;
  feedPostId?: string;
  commentId?: string;
  actorUserId?: string;
  actorName?: string;
};

export type NotificationResourceIds = {
  listingId?: string;
  listingTitle?: string;
  inquiryId?: string;
  appointmentId?: string;
  paymentId?: string;
  applicationId?: string;
  dealId?: string;
  maintenanceTicketId?: string;
  vendorLeadId?: string;
  rentScheduleItemId?: string;
  feedPostId?: string;
  commentId?: string;
  actorUserId?: string;
  actorName?: string;
};

/** Canonical routes for notification deep links. */
export function buildNotificationHref(
  type: NotificationType,
  ids: NotificationResourceIds,
): string {
  switch (type) {
    case NotificationType.INQUIRY_CREATED:
      return ids.listingId && ids.inquiryId
        ? `/listings/${ids.listingId}/inquiries/${ids.inquiryId}`
        : '/inquiries/inbox';
    case NotificationType.INQUIRY_RESPONDED:
      return ids.inquiryId
        ? `/inquiries/mine?inquiryId=${ids.inquiryId}`
        : '/inquiries/mine';
    case NotificationType.APPOINTMENT_REQUESTED:
      return ids.appointmentId
        ? `/appointments/${ids.appointmentId}`
        : '/appointments';
    case NotificationType.APPOINTMENT_CONFIRMED:
    case NotificationType.APPOINTMENT_DECLINED:
    case NotificationType.APPOINTMENT_CANCELLED:
      return ids.appointmentId
        ? `/appointments/${ids.appointmentId}`
        : '/appointments/mine';
    case NotificationType.PAYMENT_SUCCEEDED:
    case NotificationType.PAYMENT_FAILED:
      if (ids.paymentId && ids.listingId) {
        return `/listings/${ids.listingId}/payments/${ids.paymentId}`;
      }
      return ids.paymentId ? `/payments/${ids.paymentId}` : '/payments/mine';
    case NotificationType.APPLICATION_SUBMITTED:
      return ids.listingId && ids.applicationId
        ? `/listings/${ids.listingId}/applications/${ids.applicationId}`
        : '/applications';
    case NotificationType.APPLICATION_ACCEPTED:
      if (ids.dealId) {
        return `/deals/${ids.dealId}`;
      }
      return ids.applicationId
        ? `/applications/${ids.applicationId}`
        : '/applications/mine';
    case NotificationType.APPLICATION_REJECTED:
      return ids.applicationId
        ? `/applications/${ids.applicationId}`
        : '/applications/mine';
    case NotificationType.DEAL_COMPLETED:
    case NotificationType.DEAL_CANCELLED:
      return ids.dealId ? `/deals/${ids.dealId}` : '/deals/mine';
    case NotificationType.MAINTENANCE_TICKET_CREATED:
    case NotificationType.MAINTENANCE_TICKET_ASSIGNED:
    case NotificationType.MAINTENANCE_TICKET_STATUS_CHANGED:
      return ids.maintenanceTicketId
        ? `/maintenance/tickets/${ids.maintenanceTicketId}`
        : '/maintenance/tickets';
    case NotificationType.RENT_REMINDER:
      return ids.rentScheduleItemId
        ? `/rent/items/${ids.rentScheduleItemId}`
        : '/rent/mine';
    case NotificationType.LEASE_RENEWAL_NOTICE:
      return ids.dealId ? `/deals/${ids.dealId}/renewal` : '/deals/mine';
    case NotificationType.VENDOR_LEAD_SENT:
      return ids.vendorLeadId
        ? `/vendors/leads/${ids.vendorLeadId}`
        : '/vendors/leads';
    case NotificationType.SAVED_SEARCH_MATCH:
      return ids.listingId ? `/listings/${ids.listingId}` : '/saved-searches';
    case NotificationType.LEAD_SLA_BREACH:
      return ids.listingId && ids.inquiryId
        ? `/listings/${ids.listingId}/inquiries/${ids.inquiryId}`
        : '/inquiries/inbox';
    case NotificationType.FEED_COMMENT_ON_YOUR_LISTING:
    case NotificationType.FEED_COMMENT_REPLY:
      return ids.feedPostId ? `/feed/${ids.feedPostId}` : '/feed';
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function buildNotificationMetadata(
  type: NotificationType,
  ids: NotificationResourceIds,
): NotificationMetadata {
  return {
    href: buildNotificationHref(type, ids),
    ...ids,
  };
}
