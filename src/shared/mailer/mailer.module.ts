import { Global, Module } from '@nestjs/common';
import { ApiConfigService } from '@mykwatta/core/config';
import { MailProviderName } from '@mykwatta/core/config/env.validation';
import { MailerService } from './mailer.service';
import { MAIL_PROVIDER } from './mailer.tokens';
import {
  ConsoleMailProvider,
  ResendMailProvider,
  SendgridMailProvider,
} from './providers';

@Global()
@Module({
  providers: [
    ConsoleMailProvider,
    SendgridMailProvider,
    ResendMailProvider,
    {
      provide: MAIL_PROVIDER,
      inject: [
        ApiConfigService,
        ConsoleMailProvider,
        SendgridMailProvider,
        ResendMailProvider,
      ],
      useFactory: (
        config: ApiConfigService,
        consoleProvider: ConsoleMailProvider,
        sendgridProvider: SendgridMailProvider,
        resendProvider: ResendMailProvider,
      ) => {
        switch (config.mailProvider) {
          case MailProviderName.CONSOLE:
            return consoleProvider;
          case MailProviderName.SENDGRID:
            return sendgridProvider;
          case MailProviderName.RESEND:
            return resendProvider;
          default: {
            const exhaustive: never = config.mailProvider;
            return exhaustive;
          }
        }
      },
    },
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
