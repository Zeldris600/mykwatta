import { Injectable, Logger } from '@nestjs/common';
import type {
  PlatformPushProvider,
  PushMessage,
  PushSendResult,
} from '../push.types';

@Injectable()
export class ConsolePushProvider implements PlatformPushProvider {
  private readonly logger = new Logger(ConsolePushProvider.name);

  send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    this.logger.log(
      `[console push] tokens=${tokens.length} title=${message.title} href=${message.data.href ?? ''} type=${message.data.type ?? ''}`,
    );
    return Promise.resolve({ invalidTokens: [] });
  }
}
