import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MailProviderName,
  NodeEnvironment,
  PaymentsMode,
  PushMode,
  PusherMode,
  StorageProviderName,
  TwilioMode,
  TwilioOtpChannel,
} from './env.validation';

@Injectable()
export class ApiConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): NodeEnvironment {
    return this.configService.getOrThrow<NodeEnvironment>('nodeEnv');
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnvironment.Production;
  }

  get port(): number {
    return this.configService.getOrThrow<number>('port');
  }

  get appName(): string {
    return this.configService.getOrThrow<string>('appName');
  }

  get appUrl(): string {
    return this.configService.getOrThrow<string>('appUrl');
  }

  /** Public web app origin for deep links (WhatsApp continue, emails). */
  get frontendOrigin(): string {
    const configured = this.configService.get<string>('appWebOrigin')?.trim();
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    const fromCors = this.corsOrigins[0];
    if (fromCors) {
      return fromCors.replace(/\/$/, '');
    }
    return this.appUrl.replace(/\/$/, '');
  }

  get whatsappContinueBaseUrl(): string {
    return this.frontendOrigin;
  }

  get corsOrigins(): string[] {
    return this.configService
      .getOrThrow<string>('corsOrigin')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('databaseUrl');
  }

  get redisUrl(): string {
    return this.configService.getOrThrow<string>('redisUrl');
  }

  get betterAuthSecret(): string {
    return this.configService.getOrThrow<string>('betterAuth.secret');
  }

  get betterAuthUrl(): string {
    return this.configService.getOrThrow<string>('betterAuth.url');
  }

  get twilioMode(): TwilioMode {
    return this.configService.getOrThrow<TwilioMode>('twilio.mode');
  }

  get twilioOtpChannel(): TwilioOtpChannel {
    return this.configService.getOrThrow<TwilioOtpChannel>('twilio.otpChannel');
  }

  get twilioAccountSid(): string | undefined {
    return this.configService.get<string>('twilio.accountSid');
  }

  get twilioAuthToken(): string | undefined {
    return this.configService.get<string>('twilio.authToken');
  }

  get twilioWhatsappFrom(): string | undefined {
    return this.configService.get<string>('twilio.whatsappFrom');
  }

  get mailProvider(): MailProviderName {
    return this.configService.getOrThrow<MailProviderName>('mail.provider');
  }

  get mailFromEmail(): string | undefined {
    return this.configService.get<string>('mail.fromEmail');
  }

  get mailFromName(): string | undefined {
    return this.configService.get<string>('mail.fromName');
  }

  get sendgridApiKey(): string | undefined {
    return this.configService.get<string>('mail.sendgridApiKey');
  }

  get resendApiKey(): string | undefined {
    return this.configService.get<string>('mail.resendApiKey');
  }

  get storageProvider(): StorageProviderName {
    return this.configService.getOrThrow<StorageProviderName>(
      'storage.provider',
    );
  }

  get s3Endpoint(): string | undefined {
    return this.configService.get<string>('storage.s3Endpoint');
  }

  get s3AccessKey(): string | undefined {
    return this.configService.get<string>('storage.s3AccessKey');
  }

  get s3SecretKey(): string | undefined {
    return this.configService.get<string>('storage.s3SecretKey');
  }

  get s3Region(): string {
    return this.configService.get<string>('storage.s3Region') ?? 'us-east-1';
  }

  get paymentsMode(): PaymentsMode {
    return this.configService.getOrThrow<PaymentsMode>('payments.mode');
  }

  get fapshiBaseUrl(): string | undefined {
    return this.configService.get<string>('payments.fapshiBaseUrl');
  }

  get fapshiApiUser(): string | undefined {
    return this.configService.get<string>('payments.fapshiApiUser');
  }

  get fapshiApiKey(): string | undefined {
    return this.configService.get<string>('payments.fapshiApiKey');
  }

  get fapshiWebhookSecret(): string | undefined {
    return this.configService.get<string>('payments.fapshiWebhookSecret');
  }

  get stripeSecretKey(): string | undefined {
    return this.configService.get<string>('payments.stripeSecretKey');
  }

  get stripeWebhookSecret(): string | undefined {
    return this.configService.get<string>('payments.stripeWebhookSecret');
  }

  get pusherMode(): PusherMode {
    return this.configService.getOrThrow<PusherMode>('pusher.mode');
  }

  get pusherAppId(): string | undefined {
    return this.configService.get<string>('pusher.appId');
  }

  get pusherKey(): string | undefined {
    return this.configService.get<string>('pusher.key');
  }

  get pusherSecret(): string | undefined {
    return this.configService.get<string>('pusher.secret');
  }

  get pusherCluster(): string | undefined {
    return this.configService.get<string>('pusher.cluster');
  }

  get pushMode(): PushMode {
    return this.configService.getOrThrow<PushMode>('push.mode');
  }

  get firebaseProjectId(): string | undefined {
    return this.configService.get<string>('push.firebaseProjectId');
  }

  get firebaseClientEmail(): string | undefined {
    return this.configService.get<string>('push.firebaseClientEmail');
  }

  get firebasePrivateKey(): string | undefined {
    return this.configService.get<string>('push.firebasePrivateKey');
  }

  get apnsKeyId(): string | undefined {
    return this.configService.get<string>('push.apnsKeyId');
  }

  get apnsTeamId(): string | undefined {
    return this.configService.get<string>('push.apnsTeamId');
  }

  get apnsBundleId(): string | undefined {
    return this.configService.get<string>('push.apnsBundleId');
  }

  get apnsPrivateKey(): string | undefined {
    return this.configService.get<string>('push.apnsPrivateKey');
  }

  get apnsProduction(): boolean {
    return this.configService.get<boolean>('push.apnsProduction') === true;
  }
}
