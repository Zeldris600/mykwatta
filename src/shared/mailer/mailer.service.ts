import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { MAIL_PROVIDER } from './mailer.tokens';
import type { MailMessage, MailProvider } from './mailer.types';

@Injectable()
export class MailerService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  async send(message: MailMessage): Promise<void> {
    if (!message.to?.trim()) {
      throw AppException.badRequest('Email recipient is required');
    }
    if (!message.subject?.trim()) {
      throw AppException.badRequest('Email subject is required');
    }
    if (!message.text?.trim() && !message.html?.trim()) {
      throw AppException.badRequest('Email body is required');
    }

    await this.provider.send({
      to: message.to.trim(),
      subject: message.subject.trim(),
      text: message.text,
      html: message.html,
    });
  }
}
