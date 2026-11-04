# Deploy (GHCR → Dokploy webhook)

| Branch | Image tag | GitHub Environment | Environment secret |
| --- | --- | --- | --- |
| `staging` | `:staging` | `staging` | `DOKPLOY_WEBHOOK_URL_STAGING` |
| `main` | `:latest` | `production` | `DOKPLOY_WEBHOOK_URL_MAIN` |

## Dokploy compose

Use **`docker-compose.yml`** (image pull). Do **not** use `docker-compose.dev.yml`.

Dokploy’s Environment tab writes a `.env` used for compose substitution. The compose file must also mount it into the containers (`env_file: .env` on `api` and `worker`) — otherwise keys like `CORS_ORIGIN` exist in the UI but are **undefined inside the process**.

```env
MYKWATTA_IMAGE=ghcr.io/zeldris600/mykwatta:staging
```

## Required Dokploy environment variables

Copy from `.env.example`. At minimum the API/worker **will not boot** without:

| Key | Example |
| --- | --- |
| `NODE_ENV` | `production` or `development` |
| `PORT` | `3000` |
| `APP_NAME` | `mykwatta` |
| `APP_URL` | `https://your-api-host` |
| `CORS_ORIGIN` | `https://your-web-app,https://…` (comma-separated, **required**) |
| `DATABASE_URL` | Neon / Postgres URL |
| `REDIS_URL` | Shared Redis URL |
| `BETTER_AUTH_SECRET` | long random secret |
| `BETTER_AUTH_URL` | same public API origin as `APP_URL` |
| `TWILIO_MODE` | `console` or `live` |
| `TWILIO_OTP_CHANNEL` | `whatsapp` |
| `MAIL_PROVIDER` | `CONSOLE` |
| `STORAGE_PROVIDER` | `CONSOLE` or `RUSTFS` |
| `PAYMENTS_MODE` | `CONSOLE` |
| `PUSHER_MODE` | `CONSOLE` |
| `PUSH_MODE` | `CONSOLE` |

If `STORAGE_PROVIDER=RUSTFS`, also set `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`.

Auth boots **before** Nest config validation. Missing auth env now throws:

`[auth] Missing required environment variable(s): CORS_ORIGIN, …`

not a cryptic `.split` TypeError.

## Database migrations

The **API** container applies Drizzle migrations from `dist/src/core/database/migrations` on every boot (unless `MIGRATE_ON_BOOT=false`). Worker does not migrate.

After deploy, API logs should include `Applying migrations…` / `Migrations up to date`. If lead-SLA queries fail with missing columns (`sla_due_at`, etc.), the DB is behind — redeploy API so migrate runs, or run `pnpm run db:migrate` against `DATABASE_URL`.
