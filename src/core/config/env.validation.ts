import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  validateSync,
  ValidateIf,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

/** console = log OTP locally; live = call Twilio APIs */
export enum TwilioMode {
  Console = 'console',
  Live = 'live',
}

/** Channel used by TwilioService.sendOtp — WhatsApp for now; SMS later if needed */
export enum TwilioOtpChannel {
  Whatsapp = 'whatsapp',
}

/** Active mailer backend — switch without changing call sites. */
export enum MailProviderName {
  CONSOLE = 'CONSOLE',
  SENDGRID = 'SENDGRID',
  RESEND = 'RESEND',
}

/** Active object storage backend — RustFS is the primary S3-compatible option. */
export enum StorageProviderName {
  CONSOLE = 'CONSOLE',
  RUSTFS = 'RUSTFS',
}

/**
 * Payments mode:
 * - CONSOLE = no live PSP calls (local complete-console endpoint)
 * - LIVE = Fapshi (XAF mobile money) + Stripe (international cards)
 */
export enum PaymentsMode {
  CONSOLE = 'CONSOLE',
  LIVE = 'LIVE',
}

/**
 * Pusher Channels mode:
 * - CONSOLE = log realtime events locally (no Pusher API)
 * - LIVE = emit to Pusher Channels (private-user-{userId})
 */
export enum PusherMode {
  CONSOLE = 'CONSOLE',
  LIVE = 'LIVE',
}

/**
 * Mobile push mode:
 * - CONSOLE = log FCM/APNs payloads locally
 * - LIVE = Firebase Cloud Messaging + Apple Push Notification service
 */
export enum PushMode {
  CONSOLE = 'CONSOLE',
  LIVE = 'LIVE',
}

class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV!: NodeEnvironment;

  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  APP_NAME!: string;

  @IsUrl({ require_tld: false })
  APP_URL!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  APP_WEB_ORIGIN?: string;

  @IsString()
  CORS_ORIGIN!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  BETTER_AUTH_SECRET!: string;

  @IsUrl({ require_tld: false })
  BETTER_AUTH_URL!: string;

  @IsEnum(TwilioMode)
  TWILIO_MODE!: TwilioMode;

  @IsEnum(TwilioOtpChannel)
  TWILIO_OTP_CHANNEL!: TwilioOtpChannel;

  @ValidateIf(
    (env: EnvironmentVariables) => env.TWILIO_MODE === TwilioMode.Live,
  )
  @IsString()
  TWILIO_ACCOUNT_SID?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.TWILIO_MODE === TwilioMode.Live,
  )
  @IsString()
  TWILIO_AUTH_TOKEN?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.TWILIO_MODE === TwilioMode.Live &&
      env.TWILIO_OTP_CHANNEL === TwilioOtpChannel.Whatsapp,
  )
  @IsString()
  TWILIO_WHATSAPP_FROM?: string;

  @IsEnum(MailProviderName)
  MAIL_PROVIDER!: MailProviderName;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.MAIL_PROVIDER === MailProviderName.SENDGRID ||
      env.MAIL_PROVIDER === MailProviderName.RESEND,
  )
  @IsString()
  MAIL_FROM_EMAIL?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM_NAME?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.MAIL_PROVIDER === MailProviderName.SENDGRID,
  )
  @IsString()
  SENDGRID_API_KEY?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.MAIL_PROVIDER === MailProviderName.RESEND,
  )
  @IsString()
  RESEND_API_KEY?: string;

  @IsEnum(StorageProviderName)
  STORAGE_PROVIDER!: StorageProviderName;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.STORAGE_PROVIDER === StorageProviderName.RUSTFS,
  )
  @IsUrl({ require_tld: false })
  S3_ENDPOINT?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.STORAGE_PROVIDER === StorageProviderName.RUSTFS,
  )
  @IsString()
  S3_ACCESS_KEY?: string;

  @ValidateIf(
    (env: EnvironmentVariables) =>
      env.STORAGE_PROVIDER === StorageProviderName.RUSTFS,
  )
  @IsString()
  S3_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsEnum(PaymentsMode)
  PAYMENTS_MODE!: PaymentsMode;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PAYMENTS_MODE === PaymentsMode.LIVE,
  )
  @IsUrl({ require_tld: false })
  FAPSHI_BASE_URL?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PAYMENTS_MODE === PaymentsMode.LIVE,
  )
  @IsString()
  FAPSHI_API_USER?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PAYMENTS_MODE === PaymentsMode.LIVE,
  )
  @IsString()
  FAPSHI_API_KEY?: string;

  @IsOptional()
  @IsString()
  FAPSHI_WEBHOOK_SECRET?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PAYMENTS_MODE === PaymentsMode.LIVE,
  )
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsEnum(PusherMode)
  PUSHER_MODE!: PusherMode;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PUSHER_MODE === PusherMode.LIVE,
  )
  @IsString()
  PUSHER_APP_ID?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PUSHER_MODE === PusherMode.LIVE,
  )
  @IsString()
  PUSHER_KEY?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PUSHER_MODE === PusherMode.LIVE,
  )
  @IsString()
  PUSHER_SECRET?: string;

  @ValidateIf(
    (env: EnvironmentVariables) => env.PUSHER_MODE === PusherMode.LIVE,
  )
  @IsString()
  PUSHER_CLUSTER?: string;

  @IsEnum(PushMode)
  PUSH_MODE!: PushMode;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  FIREBASE_PROJECT_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  FIREBASE_CLIENT_EMAIL?: string;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  FIREBASE_PRIVATE_KEY?: string;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  APNS_KEY_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  APNS_TEAM_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  APNS_BUNDLE_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.PUSH_MODE === PushMode.LIVE)
  @IsString()
  APNS_PRIVATE_KEY?: string;

  /** `true` = production APNs, anything else = sandbox. */
  @IsOptional()
  @IsString()
  APNS_PRODUCTION?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
