# 08 — Demo accounts

Seeded users for local and staging demos. They exist only after a seed (`NODE_ENV=development`, empty DB, or `SEED_ON_BOOT=true`). Production never seeds.

Login is phone OTP, same as real users. See [01-auth-identity.md](./01-auth-identity.md).

## How to sign in

1. `POST /api/auth/phone-number/send-otp` with the phone below.
2. `POST /api/auth/phone-number/verify` with the same phone and the OTP.
3. Read `set-auth-token` and send `Authorization: Bearer <token>`.
4. `GET /api/identity/me` to branch the UI on `user.personas`.

When `NODE_ENV` is `development` or `test`, the OTP is always **`000000`** (`AUTH_DEV_OTP`). Do not wait for a WhatsApp message.

```http
POST /api/auth/phone-number/send-otp
Content-Type: application/json

{ "phoneNumber": "+237670000004" }
```

```http
POST /api/auth/phone-number/verify
Content-Type: application/json

{ "phoneNumber": "+237670000004", "code": "000000" }
```

Phones are already verified. Emails are `@mykwatta.local` and are not inboxes.

## Accounts

| Name | Persona | Phone | Email | User id |
| --- | --- | --- | --- | --- |
| Platform Admin | `PLATFORM_ADMIN` | `+237670000001` | `admin@mykwatta.local` | `seed_user_admin` |
| Ada Mbarga | `LANDLORD` | `+237670000002` | `landlord@mykwatta.local` | `seed_user_landlord` |
| Jean Nkolo | `AGENT` | `+237670000003` | `agent@mykwatta.local` | `seed_user_agent` |
| Marie Fotso | `RENTER` | `+237670000004` | `renter@mykwatta.local` | `seed_user_renter` |
| Paul Essomba | `BUYER` | `+237670000005` | `buyer@mykwatta.local` | `seed_user_buyer` |

Jean is `OWNER` of **Capital Homes Agency** (`seed_org_capital_homes`, slug `capital-homes`). A pending invite for `pm.invitee@mykwatta.local` (`PROPERTY_MANAGER`) is attached to that org. Token: `seed_invite_token_capital_homes_pm`.

No seeded caretaker, investor, or vendor user. Create those through signup if a screen needs them.

## What each account already has

### Platform Admin — `+237670000001`

Empty inbox of personal listings. Use this session for admin verification, reports, and platform stats.

### Ada (landlord) — `+237670000002`

Owns two listings:

| Id | Title | Status | Type |
| --- | --- | --- | --- |
| `seed_listing_bastos_rent` | 2-bedroom apartment in Bastos | `PUBLISHED` | `RENT` · Yaoundé · 350 000 XAF |
| `seed_listing_akwa_draft` | Studio near Akwa | `DRAFT` | `RENT` · Douala · 120 000 XAF |

Bastos already has an open inquiry from Marie, a responded inquiry from Paul, a requested viewing, and a confirmed viewing. Akwa is the unpublished listing (no public browse).

### Jean (agent) — `+237670000003`

Owns the published sale listing on the agency:

| Id | Title | Status | Type |
| --- | --- | --- | --- |
| `seed_listing_bonanjo_sale` | Commercial loft in Bonanjo | `PUBLISHED` | `SALE` · Douala · 45 000 000 XAF |

`GET /api/identity/me` returns the Capital Homes membership (`OWNER`).

### Marie (renter) — `+237670000004`

| Already in the DB | Id |
| --- | --- |
| Saved Bastos | `seed_favorite_renter_bastos` |
| Open inquiry on Bastos | `seed_inquiry_bastos_open` |
| Requested viewing (in 3 days) | `seed_appt_bastos_requested` |
| Active review on Bastos | `seed_review_bastos_renter` |
| Succeeded listing deposit | `seed_payment_deposit_ok` · 50 000 XAF · MoMo · `SUCCEEDED` |

### Paul (buyer) — `+237670000005`

| Already in the DB | Id |
| --- | --- |
| Saved Bonanjo | `seed_favorite_buyer_bonanjo` |
| Responded inquiry on Bastos | `seed_inquiry_bastos_responded` |
| Confirmed viewing (in 5 days) | `seed_appt_bastos_confirmed` |
| Deposit waiting on the client | `seed_payment_deposit_pending` · 25 000 USD · card · `REQUIRES_ACTION` |

## Listings you can open without auth

Public browse returns the two `PUBLISHED` rows only:

- `seed_listing_bastos_rent`
- `seed_listing_bonanjo_sale`

`seed_listing_akwa_draft` is owner-only (Ada). Seed media rows exist, but the image bytes are not uploaded — photo URLs may be empty until someone uploads.

## Suggested demo path

```
Marie  +237670000004   saved listing, open inquiry, requested viewing, paid deposit
Ada    +237670000002   owner inbox, confirm the requested viewing, draft studio
Jean   +237670000003   agency sale listing + org membership
Paul   +237670000005   saved sale, confirmed viewing, deposit still REQUIRES_ACTION
Admin  +237670000001   verification / platform stats
```

OTP for every row: `000000`.
