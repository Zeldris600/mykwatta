export enum NotificationEntityType {
  LISTING = 'LISTING',
  INQUIRY = 'INQUIRY',
  APPOINTMENT = 'APPOINTMENT',
  PAYMENT = 'PAYMENT',
  APPLICATION = 'APPLICATION',
  DEAL = 'DEAL',
  MAINTENANCE_TICKET = 'MAINTENANCE_TICKET',
  VENDOR_LEAD = 'VENDOR_LEAD',
  RENT_SCHEDULE = 'RENT_SCHEDULE',
}

export const NOTIFICATION_ENTITY_TYPES = Object.values(
  NotificationEntityType,
) as [NotificationEntityType, ...NotificationEntityType[]];
