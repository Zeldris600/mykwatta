import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import type {
  NotificationRealtimePayload,
  PusherChannelAuthResponse,
  PusherProvider,
} from '../pusher.types';

@Injectable()
export class ConsolePusherProvider implements PusherProvider {
  private readonly logger = new Logger(ConsolePusherProvider.name);

  trigger(
    channel: string,
    event: string,
    data: NotificationRealtimePayload,
  ): Promise<void> {
    this.logger.log(
      `[console pusher] channel=${channel} event=${event} id=${data.id} type=${data.type} href=${data.metadata.href}`,
    );
    return Promise.resolve();
  }

  authorizeChannel(
    socketId: string,
    channel: string,
  ): PusherChannelAuthResponse {
    void socketId;
    void channel;
    throw AppException.badRequest(
      'Realtime channel auth requires PUSHER_MODE=LIVE',
    );
  }
}
