/** Private channel for a single user's in-app notifications. */
export function privateUserChannel(userId: string): string {
  return `private-user-${userId}`;
}

/** Event name pushed on the private user channel when a notification is created. */
export const NOTIFICATION_PUSHER_EVENT = 'notification';
