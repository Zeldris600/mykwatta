/** Private channel for a single user's in-app notifications. */
export function privateUserChannel(userId: string): string {
  return `private-user-${userId}`;
}

/** Public channel for platform feed drops (no auth required). */
export const PUBLIC_FEED_CHANNEL = 'public-feed';

/** Event name pushed on the private user channel when a notification is created. */
export const NOTIFICATION_PUSHER_EVENT = 'notification';

/** Event name when a feed post becomes ACTIVE. */
export const FEED_POST_PUSHER_EVENT = 'feed.post';
