# MYKWATTA Backend Milestones

**Frontend integration guides:** [`docs/fe-integration/`](./fe-integration/README.md)

## Foundations

- NestJS 12 + Express
- Layout: `core/`, `shared/`, `modules/`
- Config validation, Drizzle, Redis, BullMQ (`EMAIL`, `OTP`) + mailer (`CONSOLE`/`SENDGRID`/`RESEND`) + worker
- Local stack (`docker compose`): Postgres 16, Redis 7, **RustFS** (S3 API `:9000`, console `:9001`)
- Storage module: `STORAGE_PROVIDER=CONSOLE|RUSTFS` via `StorageService`; buckets `mykwatta-listings` / `mykwatta-kyc` ensured once on boot
- Common filters, interceptors, validation, request context, money/i18n helpers
- Health live/ready
- DB seeder: `pnpm run db:seed` (fixtures in `src/core/database/seeder/data.ts`; no KYC/media — upload after)

## Auth (current)

- Better Auth + phone OTP plugin
- OTP via **`TwilioService.sendOtp()`** (`shared/twilio`)
- Signup: real email + name + phone + **personas** (no org required)
- Login: Better Auth send-otp + verify
- Auth OpenAPI / Try-it UI: [`/api/auth/reference`](http://localhost:3000/api/auth/reference)
- Bearer plugin: after OTP verify, copy `set-auth-token` response header → Swagger **Authorize** as Bearer
- Organisations are **opt-in** (agencies/portfolios), separate from personas

### Personas (account-level, many allowed)

`RENTER` · `BUYER` · `LANDLORD` · `AGENT` · `CARETAKER` · `CONSTRUCTION_CLIENT` · `DEVELOPER` · `INVESTOR`

### Flows

1. **Signup:** send-otp → `POST /api/identity/auth/signup` `{ phoneNumber, code, email, name, personas }`
2. **Login:** Better Auth `/phone-number/send-otp` + `/phone-number/verify`
3. **Org (optional):** `POST /api/identity/organisations` after signup
4. **Invites:** `POST .../organisations/:id/invites` → email queue → `POST /invites/accept`

## KYC

- Multipart submit (`document` file + metadata) → stored in RustFS/console → `UNDER_REVIEW`
- Responses include short-lived signed `documentUrl` (object key is not exposed)
- Platform admin (`PLATFORM_ADMIN` persona) decides `APPROVED` / `REJECTED`
- **Publish listing requires approved KYC** on the listing owner

## Listings (current)

- Draft → publish → archive
- Types: `RENT` / `SALE`; property types: apartment, house, studio, duplex, land, commercial, other
- Public browse of `PUBLISHED`; create requires `LANDLORD` / `AGENT` / `DEVELOPER` (or org role)
- Optional `organisationId` for agency-posted listings
- **Photos:** `POST/GET/DELETE /listings/:id/media` (jpeg/png/webp, max 12); signed URLs on listing payloads
- **Publish requires ≥1 photo** + approved KYC
- **Saved / shortlist:** `POST/DELETE /listings/:id/save`, `GET /listings/saved` (`RENTER`/`BUYER`); `saved` flag on browse payloads
- **Viewings:** inquiry → `POST /inquiries/:id/appointments` → confirm/decline/cancel/complete
- Reviews: rating 1–5 on published listings (one per user; no self-review)
- Inquiries (leads): open → respond → close; email notify owner + inquirer

## Payments / deposits

- `POST /payments/deposits` — listing deposit checkout
- Routing: `MOBILE_MONEY` + XAF → [Fapshi](https://docs.fapshi.com/en); `CARD` + USD/EUR → Stripe
- `PAYMENTS_MODE=CONSOLE|LIVE`; webhooks `POST /webhooks/fapshi`, `POST /webhooks/stripe`

## Notifications (in-app + realtime)

- Fire-and-forget: `notifications.notify()` enqueues a BullMQ `NOTIFICATIONS` event; worker delivers channels
- Routing: prefs gate consent; policy picks IN_APP+PUSH+WHATSAPP by urgency (email/SMS only critical fallback)
- `GET /notifications`, `GET /notifications/unread-count`, mark read / read-all
- Emitted for inquiries, appointments, payments, applications (email payload on the same event)
- Each row includes `metadata` (`href` + resource ids) for FE / push deep links
- Pusher: `PUSHER_MODE=CONSOLE|LIVE`; event `notification` on `private-user-{userId}`
- `GET /notifications/realtime` (key/cluster/channel) · `POST /notifications/pusher/auth`
- Mobile push: `PUSH_MODE=CONSOLE|LIVE` — FCM + APNs; devices `POST/GET/DELETE /notifications/devices`
- Preferences: `GET/PATCH /notifications/preferences` — `channels` (PUSH, IN_APP, WHATSAPP, EMAIL, SMS) + per-type toggles; consent `POST .../preferences/channels/:channel/enable|disable`

## Applications / offers

- Require a **succeeded** listing deposit (`paymentId`)
- `RENTAL_APPLICATION` (RENT) · `PURCHASE_OFFER` (SALE, needs `offerAmountMinor`)
- `POST /applications` → owner `decide` (accept/reject) · applicant `withdraw`
- Accept opens a **deal** (`LEASE` / `SALE_AGREEMENT`), listing → `UNDER_CONTRACT`, other active apps auto-rejected

## Deals (post-acceptance)

- `GET /deals/mine`, `GET /deals/:id`, `POST .../complete` (owner → listing `ARCHIVED`), `POST .../cancel` (re-publishes listing)
- Complete/cancel notify the other party (`DEAL_COMPLETED` / `DEAL_CANCELLED`); under-contract listings cannot be edited, republished, or archived outside the deal lifecycle

## Discovery

- Public browse filters: `city` (ilike), `q`, `listingType`, `propertyType`, `minPriceMinor`/`maxPriceMinor`, `minBedrooms`, map `north`/`south`/`east`/`west` (listing `latitude`/`longitude`)
- **Quartiers:** `geo_cities` / `geo_quartiers` (GeoJSON `boundary`); browse `quartierId`; `GET /geo/cities`, `/geo/cities/:id/quartiers`, `/geo/quartiers.geojson`
- Seeded polygons: Bastos, Odza, Bonanjo, Akwa, Bonapriso

## Cameroon advantage (Phases 1–5)

### Phase 1 — Trust, escrow, MoMo UX, WhatsApp, geo, stats

- Listing `verificationStatus`, `trustFrozenAt`, manual `duplicateOfListingId`; public `trustChecklist`
- Reports + admin freeze/verify/duplicate; org licence/NUI upload + admin verify
- Internal escrow ledger (`HELD` → release/refund) on deposit success; `GET /escrow/me`
- Payment quotes (deposit / viewing / application) + XAF receipt notifications
- `whatsappContinueUrl` on inquiry/appointment; daily lead digest; Twilio inbound → inquiry thread
- `preferredLocale` (`PATCH /identity/me/locale`); FR/EN message catalog
- `GET /stats/me` + `GET /stats/platform`

### Phase 2 — Title, alerts, amenities

- `titleStatus` + title document vault + `documentsVerifiedByMykwatta`
- Amenity/landmark catalogs + listing links + browse filters
- Notaire/lawyer directory; saved searches + match worker

### Phase 3 — Agency + media

- Org lead assignment + 24h SLA scanner; `VIRTUAL` appointments + `meetingUrl`
- Deal `commissionBps`; media `PHOTO`/`FLOOR_PLAN` + quality score; premium apply gate

### Phase 4 — Comps + caretaker/rent

- `GET /comps/query` quartile stats (insufficient when n &lt; 5)
- Maintenance tickets; rent schedules/items + occupancy helpers

### Phase 5 — Retention

- Rent reminders + renewal notices; vendors + lead fee; paid docs-verification admin flag
- Stats enriched across phases for owners/seekers/admins/caretakers

Migrations: `0015` (P1), `0016` (P4/P5), `0017` (P2/P3) — run `npm run db:migrate` then `npm run db:seed`.
