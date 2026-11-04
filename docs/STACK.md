# MYKWATTA local stack

Frontend wiring: [`fe-integration/`](./fe-integration/README.md)

```bash
pnpm run dev:up
# or: docker compose -f docker-compose.dev.yml up --build -d
```

| Service  | Port(s)     | Notes                                      |
|----------|-------------|--------------------------------------------|
| **API**  | `3000`      | Nest app · http://localhost:3000/api/docs  |
| Worker   | —           | BullMQ processors                          |
| Postgres | `5432`      | user/pass/db: `postgres` / `postgres` / `mykwatta` |
| Redis    | `6379`      | BullMQ + cache                             |
| RustFS   | `9000` S3, `9001` console | Primary S3-compatible object store |

App env (see `.env.example`):

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mykwatta`
- `REDIS_URL=redis://localhost:6379`
- `STORAGE_PROVIDER=RUSTFS` with `S3_ENDPOINT=http://localhost:9000` and matching keys
- Buckets (created once on boot): `mykwatta-listings`, `mykwatta-kyc` (`StorageBucket`)
- Payments: `PAYMENTS_MODE=CONSOLE|LIVE` — Fapshi (XAF MoMo) + Stripe (cards); webhooks under `/api/webhooks/*`
- Pusher: `PUSHER_MODE=CONSOLE|LIVE` — private `private-user-{userId}` + event `notification`; auth `POST /api/notifications/pusher/auth`
- Push: `PUSH_MODE=CONSOLE|LIVE` — FCM + APNs via registered `push_devices` (`POST /api/notifications/devices`)

Compose overrides in-container `DATABASE_URL` / `REDIS_URL` / `S3_ENDPOINT` to service hostnames (`postgres`, `redis`, `rustfs`). Keep host `.env` on `localhost` for running the API outside Docker.

With `NODE_ENV=development`, the API migrates on boot and seeds if empty (`SEED_ON_BOOT=true` to wipe+seed every boot).

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
