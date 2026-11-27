import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import {
  FEED_POST_PUSHER_EVENT,
  NOTIFICATION_PUSHER_EVENT,
  PUBLIC_FEED_CHANNEL,
  privateUserChannel,
} from './pusher.constants';
import { PUSHER_PROVIDER } from './pusher.tokens';
import type {
  FeedPostRealtimePayload,
  NotificationRealtimePayload,
  PusherChannelAuthResponse,
  PusherClientConfig,
  PusherProvider,
  PusherPublicFeedConfig,
} from './pusher.types';

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);

  constructor(
    private readonly config: ApiConfigService,
    @Inject(PUSHER_PROVIDER) private readonly provider: PusherProvider,
  ) {}

  /** Fire-and-forget: logs on failure, never throws to callers. */
  async emitNotification(
    userId: string,
    payload: NotificationRealtimePayload,
  ): Promise<void> {
    const channel = privateUserChannel(userId);
    try {
      await this.provider.trigger(channel, NOTIFICATION_PUSHER_EVENT, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to emit notification realtime user=${userId} id=${payload.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Fire-and-forget public feed drop. */
  async emitFeedPost(payload: FeedPostRealtimePayload): Promise<void> {
    try {
      await this.provider.trigger(
        PUBLIC_FEED_CHANNEL,
        FEED_POST_PUSHER_EVENT,
        payload,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to emit feed.post feedPostId=${payload.feedPostId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  authorizeUserChannel(
    userId: string,
    socketId: string,
    channelName: string,
  ): PusherChannelAuthResponse {
    const expected = privateUserChannel(userId);
    if (channelName !== expected) {
      throw AppException.forbidden('Not authorized for this channel');
    }
    return this.provider.authorizeChannel(socketId, channelName);
  }

  clientConfig(userId: string): PusherClientConfig {
    return {
      mode: this.config.pusherMode,
      key: this.config.pusherKey ?? null,
      cluster: this.config.pusherCluster ?? null,
      channel: privateUserChannel(userId),
      event: NOTIFICATION_PUSHER_EVENT,
    };
  }

  publicFeedConfig(): PusherPublicFeedConfig {
    return {
      mode: this.config.pusherMode,
      key: this.config.pusherKey ?? null,
      cluster: this.config.pusherCluster ?? null,
      channel: PUBLIC_FEED_CHANNEL,
      event: FEED_POST_PUSHER_EVENT,
    };
  }
}
