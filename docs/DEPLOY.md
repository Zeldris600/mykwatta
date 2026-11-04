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

### Domains (Traefik)

- Service: **api** (not worker)
- **Port = same as `PORT` in Environment** (e.g. both `3005`). Nest listens on `PORT`; compose publishes `${PORT}:${PORT}`. Mismatch → `/api/docs` dead while worker still looks healthy.
- HTTPS / Let’s Encrypt as usual

### Public URLs (not localhost)

Set these to the sslip/Dokploy domain (or your real host):

```env
PORT=3005
APP_URL=https://mykwatta-api-….sslip.io
BETTER_AUTH_URL=https://mykwatta-api-….sslip.io
CORS_ORIGIN=https://your-web-app,https://…
```

### Postgres on another Dokploy service

`DATABASE_URL` host must be the **exact** Postgres container/service hostname (copy from that service’s overview), and the API compose must share its Docker network (Dokploy → Advanced / networks).

`getaddrinfo EAI_AGAIN …` means DNS cannot resolve that host from the API/worker containers — wrong name or not on the same network. Migrations will not run until the API can connect.

If the DB username contains `@` (email), URL-encode it as `%40`:

```env
DATABASE_URL=postgresql://user%40example.com:PASSWORD@mykwatta-mykwatta-xxxxx:5432/mykwatta
```

## Required Dokploy environment variables

Copy from `.env.example`. At minimum the API/worker **will not boot** without:

| Key | Example |
| --- | --- |
| `NODE_ENV` | `production` or `development` |
| `APP_NAME` | `mykwatta` |
| `APP_URL` | `https://your-api-host` (public, not localhost) |
| `CORS_ORIGIN` | `https://your-web-app,https://…` (comma-separated, **required**) |
| `DATABASE_URL` | Postgres URL (reachable hostname on shared network) |
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

The **API** container applies Drizzle migrations from `dist/src/core/database/migrations` on every boot (unless `MIGRATE_ON_BOOT=false`). Worker does **not** migrate — filter logs to the **api** service and look for `Applying migrations…` / `Migrations up to date`.

If the API cannot reach Postgres, migrate never runs and the worker will keep failing queries (`EAI_AGAIN` / missing columns).
