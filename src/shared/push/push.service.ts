import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApiConfigService } from '@mykwatta/core/config';
import { PushMode } from '@mykwatta/core/config/env.validation';
import { PushPlatform } from '@mykwatta/modules/notifications/constants';
import {
  APNS_PUSH_PROVIDER,
  CONSOLE_PUSH_PROVIDER,
  FCM_PUSH_PROVIDER,
} from './push.tokens';
import type {
  PlatformPushProvider,
  PushDeviceTarget,
  PushMessage,
} from './push.types';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly config: ApiConfigService,
    @Inject(CONSOLE_PUSH_PROVIDER)
    private readonly consoleProvider: PlatformPushProvider,
    @Inject(FCM_PUSH_PROVIDER)
    private readonly fcmProvider: PlatformPushProvider,
    @Inject(APNS_PUSH_PROVIDER)
    private readonly apnsProvider: PlatformPushProvider,
  ) {}

  /**
   * Fire-and-forget safe. Returns invalid tokens for callers to prune.
   * Never throws to notification callers.
   */
  async sendToDevices(
    devices: PushDeviceTarget[],
    message: PushMessage,
  ): Promise<string[]> {
    if (devices.length === 0) {
      return [];
    }

    try {
      if (this.config.pushMode === PushMode.CONSOLE) {
        await this.consoleProvider.send(
          devices.map((device) => device.token),
          message,
        );
        return [];
      }

      const fcmTokens = devices
        .filter((device) => device.platform === PushPlatform.FCM)
        .map((device) => device.token);
      const apnsTokens = devices
        .filter((device) => device.platform === PushPlatform.APNS)
        .map((device) => device.token);

      const [fcmResult, apnsResult] = await Promise.all([
        fcmTokens.length > 0
          ? this.fcmProvider.send(fcmTokens, message)
          : Promise.resolve({ invalidTokens: [] as string[] }),
        apnsTokens.length > 0
          ? this.apnsProvider.send(apnsTokens, message)
          : Promise.resolve({ invalidTokens: [] as string[] }),
      ]);

      return [...fcmResult.invalidTokens, ...apnsResult.invalidTokens];
    } catch (error) {
      this.logger.warn(
        `Push send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
