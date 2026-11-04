import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Notification, Provider } from '@parse/node-apn';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import { PushMode } from '@mykwatta/core/config/env.validation';
import type {
  PlatformPushProvider,
  PushMessage,
  PushSendResult,
} from '../push.types';
import { normalizePem } from '../push.util';

const INVALID_APNS_REASONS = new Set([
  'BadDeviceToken',
  'Unregistered',
  'ExpiredToken',
  'DeviceTokenNotForTopic',
]);

@Injectable()
export class ApnsPushProvider implements PlatformPushProvider, OnModuleDestroy {
  private readonly logger = new Logger(ApnsPushProvider.name);
  private readonly provider: Provider | null;
  private readonly bundleId: string | null;

  constructor(config: ApiConfigService) {
    if (config.pushMode !== PushMode.LIVE) {
      this.provider = null;
      this.bundleId = null;
      return;
    }

    const keyId = config.apnsKeyId;
    const teamId = config.apnsTeamId;
    const bundleId = config.apnsBundleId;
    const privateKey = config.apnsPrivateKey;

    if (!keyId || !teamId || !bundleId || !privateKey) {
      throw AppException.external(
        'PUSH_MODE=LIVE requires APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, and APNS_PRIVATE_KEY',
      );
    }

    this.bundleId = bundleId;
    this.provider = new Provider({
      token: {
        key: normalizePem(privateKey),
        keyId,
        teamId,
      },
      production: config.apnsProduction,
    });
  }

  onModuleDestroy(): void {
    void this.provider?.shutdown();
  }

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    if (tokens.length === 0) {
      return { invalidTokens: [] };
    }

    const provider = this.requireProvider();
    const bundleId = this.bundleId;
    if (!bundleId) {
      throw AppException.external('APNs bundle id is not configured');
    }

    const notification = new Notification();
    notification.topic = bundleId;
    notification.expiry = Math.floor(Date.now() / 1000) + 3600;
    notification.sound = 'default';
    notification.alert = {
      title: message.title,
      body: message.body,
    };
    notification.payload = message.data;
    notification.pushType = 'alert';

    const result = await provider.send(notification, tokens);
    const invalidTokens: string[] = [];

    for (const failure of result.failed) {
      const reason = failure.response?.reason;
      if (reason && INVALID_APNS_REASONS.has(reason)) {
        invalidTokens.push(failure.device);
      } else {
        this.logger.warn(
          `APNs send failed token=…${failure.device.slice(-8)} reason=${reason ?? failure.error?.message ?? 'unknown'}`,
        );
      }
    }

    return { invalidTokens };
  }

  private requireProvider(): Provider {
    if (!this.provider) {
      throw AppException.external('APNs client is not configured');
    }
    return this.provider;
  }
}
