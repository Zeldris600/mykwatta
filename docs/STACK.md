# MYKWATTA local stack

Frontend wiring: [`fe-integration/`](./fe-integration/README.md)  
Production (GHCR + Dokploy): [`DEPLOY.md`](./DEPLOY.md)

```bash
pnpm run dev:up
# or: docker compose -f docker-compose.dev.yml up --build -d
```

| Service  | Port(s)     | Notes                                      |
|----------|-------------|--------------------------------------------|
| **API**  | `3000`      | Nest app · http://localhost:3000/api/docs  |
| Worker   | —           | BullMQ processors                          |
| Postgres | `POSTGRES_PORT` (default `5432`) | user/pass/db: `postgres` / `postgres` / `mykwatta` |
| Redis    | —           | **External** — set `REDIS_URL` (e.g. another Dokploy project’s Redis) |
| RustFS   | `S3_PORT` / `S3_CONSOLE_PORT` | Primary S3-compatible object store |

App env (see `.env.example`). Compose loads **`.env` via `env_file` only** (no hardcoded overrides):

- Host: `DATABASE_URL=…@localhost:$POSTGRES_PORT/mykwatta`, `S3_ENDPOINT=http://localhost:$S3_PORT`
- Inside compose network: hostnames `postgres`, `rustfs`
- Redis: `REDIS_URL=redis://<shared-redis-service>:6379` on the same Docker/Dokploy network
- Buckets (created once on boot): `mykwatta-listings`, `mykwatta-kyc` (`StorageBucket`)
- Payments: `PAYMENTS_MODE=CONSOLE|LIVE` — Fapshi (XAF MoMo) + Stripe (cards); webhooks under `/api/webhooks/*`
- Pusher: `PUSHER_MODE=CONSOLE|LIVE` — private `private-user-{userId}` + event `notification`; auth `POST /api/notifications/pusher/auth`
- Push: `PUSH_MODE=CONSOLE|LIVE` — FCM + APNs via registered `push_devices` (`POST /api/notifications/devices`)

The API always migrates on boot (`MIGRATE_ON_BOOT=false` to skip). With `NODE_ENV=development`, it also seeds if empty (`SEED_ON_BOOT=true` to wipe+seed every boot).

### Seed data

Seeding wipes tables and loads fixtures from [`src/core/database/seeder/data.ts`](../src/core/database/seeder/data.ts) (users, orgs, DRAFT listings, favorites, inquiries, appointments, payments). **Blocked in production.**

KYC documents and listing photos are **not** seeded — upload them via the API after seed, then publish.

| Persona | Phone | Email |
|---------|-------|-------|
| PLATFORM_ADMIN | `+237670000001` | `admin@mykwatta.local` |
| LANDLORD | `+237670000002` | `landlord@mykwatta.local` |
| AGENT | `+237670000003` | `agent@mykwatta.local` |
| RENTER | `+237670000004` | `renter@mykwatta.local` |
| BUYER | `+237670000005` | `buyer@mykwatta.local` |
