import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import twilio, { Twilio } from 'twilio';
import { AppException } from '@mykwatta/core/common/exceptions/app.exception';
import { t } from '@mykwatta/core/common/utils/i18n/messages';
import { ApiConfigService } from '@mykwatta/core/config';
import {
  TwilioMode,
  TwilioOtpChannel,
} from '@mykwatta/core/config/env.validation';

@Injectable()
export class TwilioService implements OnModuleInit {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio | null = null;

  constructor(private readonly config: ApiConfigService) {}

  onModuleInit(): void {
    if (this.config.twilioMode === TwilioMode.Live) {
      this.client = this.createClient();
    }
  }

  /**
   * Deliver a one-time code. Channel comes from TWILIO_OTP_CHANNEL (whatsapp today).
   * Prefer enqueueing via OtpProducer; this is the OTP processor sink.
   */
  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    if (!phoneNumber?.trim()) {
      throw AppException.badRequest(
        'Phone number is required for OTP delivery',
      );
    }
    if (!code?.trim()) {
      throw AppException.badRequest('OTP code is required');
    }

    const body = t('auth.otp.sent', 'en', { code });
    const channel = this.config.twilioOtpChannel;

    try {
      if (this.config.twilioMode === TwilioMode.Console) {
        this.logger.log(
          `[console Twilio OTP] channel=${channel} to=${phoneNumber} code=${code} message=${body}`,
        );
        return;
      }

      if (channel !== TwilioOtpChannel.Whatsapp) {
        throw AppException.badRequest(
          `Unsupported Twilio OTP channel: ${String(channel)}`,
        );
      }

      await this.sendWhatsappMessage(phoneNumber, body);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Twilio OTP failed channel=${channel} to=${phoneNumber}: ${reason}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw AppException.external('Failed to send OTP via Twilio', {
        channel,
        reason,
      });
    }
  }

  /** General WhatsApp text send — reusable beyond OTP later. */
  async sendWhatsappMessage(to: string, body: string): Promise<string> {
    const client = this.requireClient();
    const from = this.config.twilioWhatsappFrom;
    if (!from) {
      throw AppException.external(
        'TWILIO_WHATSAPP_FROM is required for WhatsApp messaging',
      );
    }

    const toWhatsapp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const fromWhatsapp = from.startsWith('whatsapp:')
      ? from
      : `whatsapp:${from}`;

    try {
      const message = await client.messages.create({
        from: fromWhatsapp,
        to: toWhatsapp,
        body,
      });
      this.logger.log(
        `Twilio WhatsApp sent sid=${message.sid} to=${toWhatsapp}`,
      );
      return message.sid;
    } catch (error) {
      throw this.mapTwilioApiError(error, 'WhatsApp');
    }
  }

  private createClient(): Twilio {
    const accountSid = this.config.twilioAccountSid;
    const authToken = this.config.twilioAuthToken;
    if (!accountSid || !authToken) {
      throw AppException.external(
        'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required when TWILIO_MODE=live',
      );
    }
    return twilio(accountSid, authToken);
  }

  private requireClient(): Twilio {
    if (!this.client) {
      throw AppException.external(
        'Twilio client is not available. Set TWILIO_MODE=live with valid credentials',
      );
    }
    return this.client;
  }

  private mapTwilioApiError(error: unknown, surface: string): AppException {
    const twilioError = error as {
      message?: string;
      code?: number | string;
      status?: number;
      moreInfo?: string;
    };

    this.logger.error(
      `Twilio ${surface} API error code=${String(twilioError.code ?? 'n/a')} status=${String(twilioError.status ?? 'n/a')}: ${twilioError.message ?? 'unknown'}`,
    );

    return AppException.external(`Twilio ${surface} API request failed`, {
      provider: 'twilio',
      surface,
      twilioCode: twilioError.code,
      twilioStatus: twilioError.status,
      reason: twilioError.message,
      moreInfo: twilioError.moreInfo,
    });
  }
}
