import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { bearer, openAPI, phoneNumber } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@mykwatta/core/database/schema';
import { enqueueOtp } from '@mykwatta/shared/twilio/otp.bridge';

const client = postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });
const db = drizzle(client, { schema });

/**
 * Phone OTP auth via Better Auth.
 * - Login (existing users): Better Auth /phone-number/send-otp + /phone-number/verify
 * - Signup (new users): POST /api/identity/auth/signup with real email + name + phone + OTP
 *   (Better Auth's signUpOnVerification fakes email/name — we do not use it.)
 * - Interactive API reference (Scalar): GET /api/auth/reference
 *
 * Env is validated by AppConfigModule before the app serves traffic.
 */
export const auth = betterAuth({
  appName: process.env.APP_NAME!,
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  trustedOrigins: process.env
    .CORS_ORIGIN!.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  plugins: [
    openAPI(),
    /** Exposes session as `set-auth-token` + accepts `Authorization: Bearer <token>` (Swagger / mobile). */
    bearer(),
    phoneNumber({
      sendOTP: ({ phoneNumber: to, code }) => {
        void enqueueOtp(to, code).catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`[auth] OTP enqueue failed: ${reason}`);
        });
      },
    }),
  ],
}) as unknown as ReturnType<typeof betterAuth>;
