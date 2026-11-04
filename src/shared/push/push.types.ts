import type { PushPlatform } from '@mykwatta/modules/notifications/constants';

/** All `data` values must be strings (FCM + APNs payload constraint). */
export type PushMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export type PushDeviceTarget = {
  platform: PushPlatform;
  token: string;
};

export type PushSendResult = {
  invalidTokens: string[];
};

export interface PlatformPushProvider {
  send(tokens: string[], message: PushMessage): Promise<PushSendResult>;
}
