import { Injectable, Logger } from '@nestjs/common';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import { PushMode } from '@mykwatta/core/config/env.validation';
import type {
  PlatformPushProvider,
  PushMessage,
  PushSendResult,
} from '../push.types';
import { normalizePem } from '../push.util';

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

@Injectable()
export class FcmPushProvider implements PlatformPushProvider {
  private readonly logger = new Logger(FcmPushProvider.name);
  private readonly messaging: Messaging | null;

  constructor(config: ApiConfigService) {
    if (config.pushMode !== PushMode.LIVE) {
      this.messaging = null;
      return;
    }

    const projectId = config.firebaseProjectId;
    const clientEmail = config.firebaseClientEmail;
    const privateKey = config.firebasePrivateKey;

    if (!projectId || !clientEmail || !privateKey) {
      throw AppException.external(
        'PUSH_MODE=LIVE requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY',
      );
    }

    const app: App =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: normalizePem(privateKey),
        }),
        projectId,
      });

    this.messaging = getMessaging(app);
  }

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    if (tokens.length === 0) {
      return { invalidTokens: [] };
    }

    const messaging = this.requireMessaging();
    const invalidTokens: string[] = [];

    // sendEachForMulticast caps at 500 tokens per call
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: message.title,
            body: message.body,
          },
          data: message.data,
          android: {
            priority: 'high',
          },
        });

        response.responses.forEach((result, index) => {
          if (result.success) {
            return;
          }
          const token = chunk[index];
          if (!token) {
            return;
          }
          const code = result.error?.code;
          if (code && INVALID_FCM_CODES.has(code)) {
            invalidTokens.push(token);
          } else {
            this.logger.warn(
              `FCM send failed token=…${token.slice(-8)} code=${code ?? 'unknown'}: ${result.error?.message ?? ''}`,
            );
          }
        });
      } catch (error) {
        this.logger.warn(
          `FCM multicast failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }

    return { invalidTokens };
  }

  private requireMessaging(): Messaging {
    if (!this.messaging) {
      throw AppException.external('FCM client is not configured');
    }
    return this.messaging;
  }
}
