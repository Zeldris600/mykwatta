import { Global, Module } from '@nestjs/common';
import {
  APNS_PUSH_PROVIDER,
  CONSOLE_PUSH_PROVIDER,
  FCM_PUSH_PROVIDER,
} from './push.tokens';
import { PushService } from './push.service';
import {
  ApnsPushProvider,
  ConsolePushProvider,
  FcmPushProvider,
} from './providers';

@Global()
@Module({
  providers: [
    ConsolePushProvider,
    FcmPushProvider,
    ApnsPushProvider,
    {
      provide: CONSOLE_PUSH_PROVIDER,
      useExisting: ConsolePushProvider,
    },
    {
      provide: FCM_PUSH_PROVIDER,
      useExisting: FcmPushProvider,
    },
    {
      provide: APNS_PUSH_PROVIDER,
      useExisting: ApnsPushProvider,
    },
    PushService,
  ],
  exports: [PushService],
})
export class PushModule {}
