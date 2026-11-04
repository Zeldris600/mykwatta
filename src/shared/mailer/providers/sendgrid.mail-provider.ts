import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { ApiConfigService } from '@mykwatta/core/config';
import type { MailMessage, MailProvider } from '../mailer.types';

@Injectable()
export class SendgridMailProvider implements MailProvider {
  private readonly logger = new Logger(SendgridMailProvider.name);
  private ready = false;

  constructor(private readonly config: ApiConfigService) {
    const apiKey = this.config.sendgridApiKey;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.ready = true;
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.ready) {
      throw AppException.external(
        'SendGrid is not configured. Set SENDGRID_API_KEY',
      );
    }

    const fromEmail = this.config.mailFromEmail;
    if (!fromEmail) {
      throw AppException.external(
        'MAIL_FROM_EMAIL is required for the SendGrid provider',
      );
    }

    try {
      const [response] = await sgMail.send({
        to: message.to,
        from: {
          email: fromEmail,
          name: this.config.mailFromName,
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(
        `SendGrid accepted status=${response.statusCode} to=${message.to}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`SendGrid send failed: ${reason}`);
      throw AppException.external('Failed to send email via SendGrid', {
        reason,
      });
    }
  }
}
