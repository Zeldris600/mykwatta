export enum NotificationChannel {
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export const NOTIFICATION_CHANNELS = Object.values(NotificationChannel) as [
  NotificationChannel,
  ...NotificationChannel[],
];
