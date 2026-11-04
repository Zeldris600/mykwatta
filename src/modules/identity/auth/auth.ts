import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { bearer, openAPI, phoneNumber } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@mykwatta/core/database/schema';
import { requireEnv } from '@mykwatta/modules/identity/auth/require-env';
import { enqueueOtp } from '@mykwatta/shared/twilio/otp.bridge';

const env = requireEnv([
  'DATABASE_URL',
  'APP_NAME',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'CORS_ORIGIN',
]);

const client = postgres(env.DATABASE_URL, { max: 5, prepare: false });
const db = drizzle(client, { schema });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isDevOtpMode = nodeEnv === 'development' || nodeEnv === 'test';
/** Fixed OTP for local/dev — never used when NODE_ENV is production/staging. */
export const AUTH_DEV_OTP = (process.env.AUTH_DEV_OTP ?? '000000').trim();

/**
 * Phone OTP auth via Better Auth.
 * - Login (existing users): Better Auth /phone-number/send-otp + /phone-number/verify
 * - Signup (new users): POST /api/identity/auth/signup with real email + name + phone + OTP
 *   (Better Auth's signUpOnVerification fakes email/name — we do not use it.)
 * - Interactive API reference (Scalar): GET /api/auth/reference
 * - Dev/test: any send-otp accepts verify with AUTH_DEV_OTP (default `000000`)
 *
 * Env is validated by AppConfigModule before the app serves traffic.
 */
export const auth = betterAuth({
  appName: env.APP_NAME,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  trustedOrigins: env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  plugins: [
    openAPI(),
    /** Exposes session as `set-auth-token` + accepts `Authorization: Bearer <token>` (Swagger / mobile). */
    bearer(),
    phoneNumber({
      sendOTP: ({ phoneNumber: to, code }) => {
        const otp = isDevOtpMode ? AUTH_DEV_OTP : code;
        void enqueueOtp(to, otp).catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`[auth] OTP enqueue failed: ${reason}`);
        });
      },
      ...(isDevOtpMode
        ? {
            verifyOTP: ({ code }: { code: string }) => code === AUTH_DEV_OTP,
          }
        : {}),
    }),
  ],
}) as unknown as ReturnType<typeof betterAuth>;
