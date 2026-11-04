# MYKWATTA — Frontend integration

Hand this folder to the FE team. It describes how to wire a web or mobile client against the Nest API.

| | |
| --- | --- |
| Local API | `http://localhost:3000` |
| Global prefix | `/api` |
| Swagger | http://localhost:3000/api/docs |
| Better Auth try-it | http://localhost:3000/api/auth/reference |
| OpenAPI JSON | http://localhost:3000/api/docs-json |

OpenAPI is the machine-readable contract. These guides add **product rules**, **status machines**, **deep links**, and **copy-paste request/response examples** that Swagger alone does not explain.

## Guides

| # | File | What you build |
| --- | --- | --- |
| 0 | [00-conventions.md](./00-conventions.md) | Envelope, errors, money, enums, HTTP client setup |
| 1 | [01-auth-identity.md](./01-auth-identity.md) | Phone OTP login/signup, session token, personas, orgs |
| 2 | [02-listings.md](./02-listings.md) | Discovery filters, listing CRUD, media, publish, saved |
| 3 | [03-engagement.md](./03-engagement.md) | Inquiries → appointments → reviews |
| 4 | [04-payments-applications-deals.md](./04-payments-applications-deals.md) | Deposit → apply/offer → deal lifecycle |
| 5 | [05-notifications.md](./05-notifications.md) | Inbox, Pusher realtime, push devices, preferences |
| 6 | [06-kyc.md](./06-kyc.md) | KYC submit + admin review (required before publish) |
| 7 | [07-trust-geo-escrow.md](./07-trust-geo-escrow.md) | Home stats, map/quartier, trust badges, quotes/escrow, WA Continue, ops screens |

## Build order (recommended)

```
1. Auth + /identity/me bootstrap
2. Public browse + listing detail (+ saved flag)
3. Notifications inbox + deep links (even if polling only)
4. Inquiries + appointments
5. KYC + owner listing create/publish/media
6. Deposit payment (console complete locally)
7. Applications + owner decide
8. Deals complete/cancel
9. Pusher LIVE + push device registration
10. Home stats + geo/quartier + trust badges (guide 07 A–C)
11. Quotes/escrow + WhatsApp Continue CTAs (guide 07 D–E)
12. Amenities/title/alerts → agency → comps/rent (guide 07 F–H)
```

## Seeded demo data (local)

OTP codes appear in API/worker logs: `[console Twilio OTP] … code=……` when `TWILIO_MODE=console`.

| Persona | Phone | Email |
| --- | --- | --- |
| `PLATFORM_ADMIN` | `+237670000001` | `admin@mykwatta.local` |
| `LANDLORD` | `+237670000002` | `landlord@mykwatta.local` |
| `AGENT` | `+237670000003` | `agent@mykwatta.local` |
| `RENTER` | `+237670000004` | `renter@mykwatta.local` |
| `BUYER` | `+237670000005` | `buyer@mykwatta.local` |

Published listings after seed: **Bastos** (RENT, Yaoundé) and **Bonanjo** (SALE, Douala). **Akwa** stays `DRAFT`.

IDs (stable):

- `seed_listing_bastos_rent`
- `seed_listing_bonanjo_sale`
- `seed_listing_akwa_draft`

## Product loops (happy paths)

### Seeker — ask + view

```
Login as RENTER
→ GET /listings (browse)
→ GET /listings/:id
→ POST /listings/:id/inquiries
→ POST /inquiries/:id/appointments
→ wait for owner confirm (notification)
```

### Owner — list a property

```
Login as LANDLORD
→ POST /kyc/submit → admin APPROVED
→ POST /listings → POST /listings/:id/media → POST /listings/:id/publish
→ GET /inquiries/inbox → respond / schedule confirm
```

### Applicant — deposit → deal

```
Login as RENTER/BUYER
→ POST /payments/deposits → (console) complete-console
→ POST /applications
→ owner POST /applications/:id/decide { status: ACCEPTED }
→ GET /deals/:dealId
```
