import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { bearer, openAPI, phoneNumber } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@mykwatta/core/database/schema';
import { createId } from '@mykwatta/core/common/utils/uuid.util';
import { Persona } from '@mykwatta/modules/identity/constants/personas';
import { requireEnv } from '@mykwatta/modules/identity/auth/require-env';
import { socialBearerRedirect } from '@mykwatta/modules/identity/auth/social-bearer-redirect';
import { enqueueOtp } from '@mykwatta/shared/twilio/otp.bridge';

const env = requireEnv([
  'DATABASE_URL',
  'APP_NAME',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'CORS_ORIGIN',
]);

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleEnabled = Boolean(googleClientId && googleClientSecret);

const client = postgres(env.DATABASE_URL, { max: 5, prepare: false });
const db = drizzle(client, { schema });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isDevOtpMode = nodeEnv === 'development' || nodeEnv === 'test';
/** Fixed OTP for local/dev — never used when NODE_ENV is production/staging. */
export const AUTH_DEV_OTP = (process.env.AUTH_DEV_OTP ?? '000000').trim();

/**
 * Auth via Better Auth.
 * - Phone OTP login: /phone-number/send-otp + /phone-number/verify
 * - Phone signup: POST /api/identity/auth/signup (real email + name + personas)
 * - Google OAuth: /sign-in/social (when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set)
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
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          prompt: 'select_account',
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Google (and any other social) sign-up has no persona picker yet —
          // default RENTER; phone signup replaces this via replacePersonas.
          try {
            await db.insert(schema.userPersonas).values({
              id: createId(),
              userId: user.id,
              persona: Persona.RENTER,
            });
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : String(error);
            console.error(
              `[auth] Failed to seed default persona for ${user.id}: ${reason}`,
            );
          }
        },
      },
    },
  },
  plugins: [
    openAPI(),
    // After-hooks run in registration order: bearer sets set-auth-token, then we append it to Location.
    bearer(),
    socialBearerRedirect(),
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
