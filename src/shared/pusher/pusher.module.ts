import { Global, Module } from '@nestjs/common';
import { ApiConfigService } from '@mykwatta/core/config';
import { PusherMode } from '@mykwatta/core/config/env.validation';
import { PusherService } from './pusher.service';
import { PUSHER_PROVIDER } from './pusher.tokens';
import { ConsolePusherProvider, LivePusherProvider } from './providers';

@Global()
@Module({
  providers: [
    ConsolePusherProvider,
    LivePusherProvider,
    {
      provide: PUSHER_PROVIDER,
      inject: [ApiConfigService, ConsolePusherProvider, LivePusherProvider],
      useFactory: (
        config: ApiConfigService,
        consoleProvider: ConsolePusherProvider,
        liveProvider: LivePusherProvider,
      ) => {
        switch (config.pusherMode) {
          case PusherMode.CONSOLE:
            return consoleProvider;
          case PusherMode.LIVE:
            return liveProvider;
          default: {
            const exhaustive: never = config.pusherMode;
            return exhaustive;
          }
        }
      },
    },
    PusherService,
  ],
  exports: [PusherService],
})
export class PusherModule {}
