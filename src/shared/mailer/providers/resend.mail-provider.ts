import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import type { MailMessage, MailProvider } from '../mailer.types';

@Injectable()
export class ResendMailProvider implements MailProvider {
  private readonly logger = new Logger(ResendMailProvider.name);
  private readonly client: Resend | null;

  constructor(private readonly config: ApiConfigService) {
    const apiKey = this.config.resendApiKey;
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.client) {
      throw AppException.external(
        'Resend is not configured. Set RESEND_API_KEY',
      );
    }

    const fromEmail = this.config.mailFromEmail;
    if (!fromEmail) {
      throw AppException.external(
        'MAIL_FROM_EMAIL is required for the Resend provider',
      );
    }

    const from = this.config.mailFromName
      ? `${this.config.mailFromName} <${fromEmail}>`
      : fromEmail;

    try {
      const { error } = await this.client.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      if (error) {
        throw AppException.external('Failed to send email via Resend', {
          reason: error.message,
        });
      }

      this.logger.log(`Resend accepted email to=${message.to}`);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Resend send failed: ${reason}`);
      throw AppException.external('Failed to send email via Resend', {
        reason,
      });
    }
  }
}
