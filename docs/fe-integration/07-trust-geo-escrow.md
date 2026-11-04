# 07 — Trust, geo, escrow & home ops

How the client uses the APIs added after the core marketplace loop (auth → browse → inquire → deposit → deal).  
All paths are under `/api`. Money is always integer **XAF minor units** (display with your money helper from [00-conventions](./00-conventions.md)).

**Depends on:** [02-listings](./02-listings.md), [03-engagement](./03-engagement.md), [04-payments](./04-payments-applications-deals.md).

---

## What you are building (screens)

| Screen / surface | Who | API you call |
| --- | --- | --- |
| **Home / dashboard** | Any logged-in user | `GET /stats/me` once after session bootstrap |
| **Map browse** | Guest / seeker | `GET /geo/*` + `GET /listings?quartierId=&north=…` |
| **Listing detail trust row** | Anyone | Fields already on `GET /listings/:id` (`trustChecklist`, `verificationStatus`) |
| **Report scam** | Logged-in | `POST /listings/:id/reports` |
| **Checkout fee breakdown** | Seeker before pay | `GET /payments/quotes/…` then existing deposit/create payment |
| **Escrow wallet** | Owner / admin | `GET /escrow/me` (+ release/refund actions) |
| **After inquire / book viewing** | Seeker | Use `whatsappContinueUrl` from create response as a primary CTA |
| **Settings → language** | Any user | `PATCH /identity/me/locale` |
| **Saved search alerts** | Seeker | CRUD `/saved-searches` |
| **Agency lead inbox** | Org agent | `/organisations/:id/leads` |
| **Maintenance / rent / comps** | Landlord / caretaker | `/maintenance`, `/rent-schedules`, `/comps/query` |

Admin-only screens (platform ops) are at the bottom.

---

## 1. Home dashboard — `GET /stats/me`

**When:** Right after you have a Bearer token and `/identity/me` (same bootstrap as notifications unread). Refresh on pull-to-refresh or when returning to the tab.

```http
GET /api/stats/me
Authorization: Bearer <token>
```

**How to render (do not invent extra API calls for these counters):**

1. Read `byPersona` for each of the user’s personas from `/identity/me`.
2. Show **only** blocks that exist for that persona (union if multi-persona).
3. Use `notificationsUnread` for the bell badge (or keep using `/notifications/unread-count` — either is fine; prefer one source).

Illustrative shape (fields grow as ops features land; treat missing keys as `0` / hide the card):

```json
{
  "notificationsUnread": 3,
  "savedSearchCount": 1,
  "newMatchCount": 2,
  "titleDocsPending": 0,
  "byPersona": {
    "RENTER": {
      "openInquiries": 1,
      "upcomingAppointments": 1,
      "applications": 0,
      "activeDeals": 0
    },
    "LANDLORD": {
      "listingsByStatus": { "PUBLISHED": 2, "DRAFT": 1 },
      "openInquiries": 4,
      "escrowHeld": 150000,
      "openTickets": 1,
      "rentDueThisWeekCount": 2,
      "rentDueThisWeekMinor": 700000
    }
  }
}
```

**FE UX**

- Seeker home: tiles → Saved, Open questions, Upcoming viewings, Active applications/deals.
- Owner home: Listings by status, Inbox, Escrow held (format XAF), Rent due this week, Open maintenance.
- Tap a tile → existing list route (`/inquiries/inbox`, `/deals/mine`, `/escrow`, etc.). Stats are **read-only aggregates**, not a second data model.

`GET /stats/platform` is **admin only** — use for an internal ops dashboard, not consumer home.

---

## 2. Map + quartier discovery

### Load geo once (cache in memory / disk)

```http
GET /api/geo/cities
GET /api/geo/cities/:cityId/quartiers
GET /api/geo/quartiers.geojson
```

| Call | FE use |
| --- | --- |
| cities | City picker |
| quartiers | Chip list / dropdown under a city |
| `.geojson` | Draw polygons on the map (FeatureCollection). Filter listings by `quartierId`, not by client-side point-in-polygon |

### Browse with quartier or map bounds

Same list endpoint as [02-listings](./02-listings.md), plus:

```http
GET /api/listings?quartierId=seed_geo_quartier_bastos&page=1&limit=20
GET /api/listings?north=3.95&south=3.8&east=11.6&west=11.4
```

You can combine with `city`, `listingType`, `minPriceMinor`, amenity filters, etc.

**Create/edit listing:** send `quartierId` from the quartier picker (ids from `/geo/.../quartiers`). Seeded ids: `seed_geo_quartier_bastos`, `_odza`, `_bonanjo`, `_akwa`, `_bonapriso`.

### Language

```http
PATCH /api/identity/me/locale
{ "preferredLocale": "fr" }
```

Store on the client and send `Accept-Language` if you already do; this field is what the API uses for OTP/receipt/WA templates.

---

## 3. Trust on listing detail

No extra fetch: trust comes on browse/detail payloads.

```json
{
  "verificationStatus": "UNVERIFIED",
  "quartierId": "seed_geo_quartier_bastos",
  "trustChecklist": {
    "phoneVerified": true,
    "kycVerified": true,
    "listingVerified": false,
    "hasPhotos": true,
    "trustFrozen": false
  }
}
```

**FE UX**

- Badge row: phone · KYC · “Listing verified” (when `listingVerified` / `verificationStatus === VERIFIED`).
- If `trustFrozen` is ever true on a payload you somehow hold, treat as unavailable (public browse already **hides** frozen + duplicate listings).
- Overflow menu: **Report listing** → modal →:

```http
POST /api/listings/:id/reports
Authorization: Bearer <token>

{ "reason": "SCAM_SUSPECTED", "details": "Asked for deposit outside the app" }
```

Show a toast; do not expect the listing to vanish immediately for the reporter (freeze is server/admin policy).

---

## 4. Fee quotes before checkout

**Gate on listing first:** read `depositAvailability` on the listing payload (see [04-payments](./04-payments-applications-deals.md)).  
Only start checkout when `canStartCheckout === true`. If `status` is `PAID` / `UNAVAILABLE` / `OPEN_CHECKOUT`, follow that guide’s table (apply / “no longer available” / resume).

**When:** On the pay sheet, **before** `POST /payments/deposits` (or other create-payment).

```http
GET /api/payments/quotes/deposit?listingId=seed_listing_bastos_rent
GET /api/payments/quotes/viewing-fee?listingId=…
GET /api/payments/quotes/application-fee?listingId=…
```

Example response:

```json
{
  "purpose": "LISTING_DEPOSIT",
  "currency": "XAF",
  "totalMinor": 350000,
  "lineItems": [
    { "label": "Listing deposit", "amountMinor": 350000 }
  ]
}
```

**FE UX:** render `lineItems` as a breakdown; button amount = `totalMinor`. Then run the existing payment flow from guide 04. Do not hardcode fee numbers in the client.

---

## 5. Escrow (owner money held by the platform)

After a deposit succeeds, the API creates a **HELD** ledger row. Owners see it here — not on the payment object alone.

```http
GET /api/escrow/me
Authorization: Bearer <token>
```

**FE UX — “Held funds” screen**

- List rows: amount (XAF), listing, status `HELD` | `RELEASED_TO_OWNER` | `REFUNDED_TO_PAYER`.
- For `HELD`, if the user is beneficiary/owner (or admin), show actions:

```http
POST /api/escrow/:id/release
{ "reason": "Viewing completed" }

POST /api/escrow/:id/refund
{ "reason": "Deal cancelled" }
```

Payer gets in-app (+ WhatsApp if consented) receipts on hold/release — wire those notification types in the inbox like any other notification.

---

## 6. WhatsApp Continue (outbound — FE owns the button)

Inquiry create and appointment schedule responses include a deep link. **You must surface it.**

```json
{
  "id": "…",
  "whatsappContinueUrl": "https://wa.me/2376…?text=…"
}
```

**FE UX**

- Success sheet after “Ask a question” / “Request viewing”:
  - Primary: **Continue on WhatsApp** → `Linking.openURL(whatsappContinueUrl)` / `window.open`.
  - Secondary: Stay in-app thread / inbox.
- Inbound WhatsApp → inquiry thread is **server/Twilio only**. FE only needs to refresh inquiry messages / react to `INQUIRY_*` notifications. Do **not** call the Twilio webhook from the app.

---

## 7. Amenities, title, saved searches

### Filters & create form

```http
GET /api/catalogs/amenities
GET /api/catalogs/landmarks
```

Use slugs in create/update listing: `amenitySlugs`, `landmarkSlugs`, `titleStatus`.  
Browse: pass amenity / `titleStatus` query params as supported by list DTO (see Swagger).

### Title vault (SALE)

```http
GET  /api/listings/:listingId/title-documents
POST /api/listings/:listingId/title-documents   # multipart (owner)
```

Buyers: show checklist / `documentsVerifiedByMykwatta` from listing detail when present.  
Notaires: `GET /api/directory/professionals?city=Douala&kind=NOTAIRE` — directory cards + tel: links (lead gen, not legal advice).

### Saved searches

```http
POST   /api/saved-searches
GET    /api/saved-searches
GET    /api/saved-searches/:id/matches
PATCH  /api/saved-searches/:id
DELETE /api/saved-searches/:id
```

**FE UX:** “Alert me” from browse (persist current filters). Home badge from `stats.me.newMatchCount` → matches list → open listing.

---

## 8. Agency leads, virtual viewing, premium

```http
GET  /api/organisations/:organisationId/leads
POST /api/organisations/:organisationId/leads/:inquiryId/assign
{ "assigneeUserId": "…" }
```

**FE UX:** org inbox table; assign member; show SLA due (server sets ~24h). Breach alerts arrive as notifications.

Appointments: send `modality: "VIRTUAL"` + `meetingUrl` when scheduling; show Join link when confirmed.

```http
POST /api/listings/:id/premium/apply
```

Only enable the button when the listing has enough photos + a floor-plan media kind (API validates; show the error body if rejected).

---

## 9. Comps, maintenance, rent

### Price context on detail / owner tools

```http
GET /api/comps/query?city=Yaoundé&quartierId=…&listingType=RENT&bedrooms=2
```

If `sufficient === false` (or `n < 5`), show “Not enough local data” — **never** invent a single “fair price”.

### Maintenance

```http
POST /api/maintenance/tickets
GET  /api/maintenance/tickets/mine
PATCH /api/maintenance/tickets/:id/assign
PATCH /api/maintenance/tickets/:id/status
```

### Rent schedules

```http
POST /api/rent-schedules/deals/:dealId
GET  /api/rent-schedules/mine
GET  /api/rent-schedules/occupancy/mine
```

Owner home tiles for rent due / occupancy come from `/stats/me`; drill-in uses these list endpoints.

### Vendors (from a ticket)

```http
GET  /api/vendors
POST /api/vendors/:vendorId/leads
```

Quote fee via `/payments/quotes/vendor-lead-fee` if you show a paid intro.

---

## 10. Admin / platform ops (separate app section)

Gate on `PLATFORM_ADMIN` persona.

| Action | Endpoint |
| --- | --- |
| Review scam reports | `GET /admin/listing-reports`, `PATCH /admin/listing-reports/:id/decide` |
| Freeze / unfreeze | `PATCH /admin/listings/:id/trust` |
| Verify listing | `PATCH /admin/listings/:id/verification` |
| Mark duplicate | `PATCH /admin/listings/:id/duplicate` |
| Review title docs | `PATCH /admin/title-documents/:documentId/review` |
| Docs verified badge | `PATCH /admin/listings/:id/documents-verified` |
| Escrow all holds | `GET /escrow/admin` |
| Platform counters | `GET /stats/platform` |
| Org licence verify | `POST /identity/admin/organisations/:id/verify-licence` |

---

## Suggested FE ship order

```
A. Bootstrap: GET /stats/me on home + preferredLocale in settings
B. Browse: city → quartier chips + GeoJSON layer; trust badges on cards/detail
C. Report listing + (admin) reports queue if you ship admin web
D. Quotes sheet → existing MoMo/deposit checkout; escrow list for owners
E. whatsappContinueUrl CTA on inquiry + appointment success
F. Amenities/title/saved searches
G. Org leads + virtual + premium
H. Comps strip + maintenance + rent schedules
```

Wire deep links from notifications the same way as guide 05 (`metadata.href`).
