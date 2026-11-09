import type { NotificationMetadata } from '@mykwatta/modules/notifications/constants';
import type {
  NotificationEntityType,
  NotificationType,
} from '@mykwatta/modules/notifications/constants';

/** Payload emitted on `private-user-{userId}` — mirrors a notifications row. */
export type NotificationRealtimePayload = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  metadata: NotificationMetadata;
  readAt: string | null;
  createdAt: string;
};

export type FeedPostRealtimePayload = {
  feedPostId: string;
  listingId: string;
  publishedAt: string;
};

export type PusherChannelAuthResponse = {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
};

export type PusherClientConfig = {
  mode: string;
  key: string | null;
  cluster: string | null;
  channel: string;
  event: string;
};

export type PusherPublicFeedConfig = {
  mode: string;
  key: string | null;
  cluster: string | null;
  channel: string;
  event: string;
};

export interface PusherProvider {
  trigger(
    channel: string,
    event: string,
    data: NotificationRealtimePayload | FeedPostRealtimePayload,
  ): Promise<void>;
  authorizeChannel(
    socketId: string,
    channel: string,
  ): PusherChannelAuthResponse;
}
