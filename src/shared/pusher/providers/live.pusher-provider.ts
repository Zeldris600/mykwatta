import { Injectable, Logger } from '@nestjs/common';
import Pusher from 'pusher';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import { PusherMode } from '@mykwatta/core/config/env.validation';
import type {
  NotificationRealtimePayload,
  PusherChannelAuthResponse,
  PusherProvider,
} from '../pusher.types';

@Injectable()
export class LivePusherProvider implements PusherProvider {
  private readonly logger = new Logger(LivePusherProvider.name);
  private readonly client: Pusher | null;

  constructor(config: ApiConfigService) {
    if (config.pusherMode !== PusherMode.LIVE) {
      this.client = null;
      return;
    }

    const appId = config.pusherAppId;
    const key = config.pusherKey;
    const secret = config.pusherSecret;
    const cluster = config.pusherCluster;

    if (!appId || !key || !secret || !cluster) {
      throw AppException.external(
        'Pusher LIVE requires PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and PUSHER_CLUSTER',
      );
    }

    this.client = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  async trigger(
    channel: string,
    event: string,
    data: NotificationRealtimePayload,
  ): Promise<void> {
    const client = this.requireClient();
    try {
      await client.trigger(channel, event, data);
    } catch (error) {
      this.logger.warn(
        `Pusher trigger failed channel=${channel} event=${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  authorizeChannel(
    socketId: string,
    channel: string,
  ): PusherChannelAuthResponse {
    return this.requireClient().authorizeChannel(socketId, channel);
  }

  private requireClient(): Pusher {
    if (!this.client) {
      throw AppException.external('Pusher client is not configured');
    }
    return this.client;
  }
}
