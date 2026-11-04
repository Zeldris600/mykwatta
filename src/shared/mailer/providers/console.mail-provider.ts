import { Injectable, Logger } from '@nestjs/common';
import type { MailMessage, MailProvider } from '../mailer.types';

@Injectable()
export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger(ConsoleMailProvider.name);

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[console mail] to=${message.to} subject=${message.subject} text=${message.text}`,
    );
    return Promise.resolve();
  }
}
