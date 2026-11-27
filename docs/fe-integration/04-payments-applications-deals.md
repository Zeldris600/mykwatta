# 04 — Payments → applications → deals

This is the commercial funnel after browse/engage. Fee quote sheets + escrow UI: [07-trust-geo-escrow.md](./07-trust-geo-escrow.md) §4–5.

```
PUBLISHED listing
    → POST /payments/deposits          (status PENDING / REQUIRES_ACTION)
    → payer completes checkout         (or complete-console in local)
    → payment SUCCEEDED
    → POST /applications               (RENTAL_APPLICATION | PURCHASE_OFFER)
    → owner decide ACCEPTED | REJECTED
         ACCEPTED → deal created
                    listing → UNDER_CONTRACT
                    other active apps → REJECTED
         → owner complete deal → listing ARCHIVED
         → either party cancel deal → listing PUBLISHED again
```

All routes require Bearer auth. Webhooks are **server-only** — FE never calls them.

---

## 1. Listing deposit payment

### Create checkout

```http
POST /api/payments/deposits
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "listingId": "seed_listing_bastos_rent",
  "amountMinor": 50000,
  "currency": "XAF",
  "channel": "MOBILE_MONEY",
  "redirectUrl": "mykwatta://payments/return"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `listingId` | yes | Must be `PUBLISHED` |
| `amountMinor` | yes | int ≥ 1 |
| `currency` | yes | `XAF` \| `USD` \| `EUR` |
| `channel` | yes | see routing table |
| `redirectUrl` | no | defaults to `{APP_URL}/payments/return` |

### Channel → provider routing

| Channel | Allowed currency | Provider |
| --- | --- | --- |
| `MOBILE_MONEY` | `XAF` | Fapshi |
| `CARD` | `USD` or `EUR` | Stripe |

Wrong combo → API error — validate in UI before submit.

### Guards (server-enforced)

- Cannot deposit on **your own** listing → `FORBIDDEN` (`depositAvailability.reason: OWN_LISTING`)
- Demo catalog listings (`isDemo: true`) → `UNAVAILABLE` (`depositAvailability.reason: DEMO`) — browseable, not bookable
- Listing `UNDER_CONTRACT` / `ARCHIVED` / not published → `CONFLICT` (no more money collected)
- Viewer already has a **SUCCEEDED** deposit covering the full listing fee (`amountMinor >= priceMinor`) → `CONFLICT` (`status: PAID`); FE should route to apply, not pay again
- Open `PENDING` / `REQUIRES_ACTION` deposit → API **returns that payment** (resume checkout; does not create a second one)
- `amountMinor` / `currency` must match the full quote (`GET /payments/quotes/deposit`) → `BAD_REQUEST` if partial

### FE marker on listing payloads: `depositAvailability`

Attached on `GET /listings`, `GET /listings/:id`, `GET /listings/mine` (viewer-aware when Bearer present):

```json
{
  "depositAvailability": {
    "status": "AVAILABLE",
    "reason": null,
    "message": "Deposit checkout is available.",
    "requiredAmountMinor": 350000,
    "currency": "XAF",
    "paymentId": null,
    "canStartCheckout": true
  }
}
```

| `status` | FE |
| --- | --- |
| `AVAILABLE` | Show **Pay deposit** if `canStartCheckout` (requires auth) |
| `OPEN_CHECKOUT` | **Resume payment** → `GET /payments/:paymentId` / open `checkoutUrl` |
| `PAID` | Hide pay; CTA **Continue to application** using `paymentId` |
| `UNAVAILABLE` | Banner from `message` — `UNDER_CONTRACT` / `ARCHIVED` = **no longer available**; `DEMO` = catalog fixture, hide book CTAs |

Do not call `POST /payments/deposits` unless `canStartCheckout === true`. On `409`, read `details.depositAvailability` and update UI.

### Payment object (response `data`)

```json
{
  "id": "…",
  "userId": "seed_user_renter",
  "listingId": "seed_listing_bastos_rent",
  "appointmentId": null,
  "purpose": "LISTING_DEPOSIT",
  "channel": "MOBILE_MONEY",
  "provider": "FAPSHI",
  "status": "REQUIRES_ACTION",
  "amountMinor": 50000,
  "currency": "XAF",
  "providerRef": "…",
  "checkoutUrl": "https://…",
  "failureReason": null,
  "paidAt": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### FE checkout UX

1. Create deposit → read `checkoutUrl` + `id`  
2. Open `checkoutUrl` (browser / Custom Tab / WebView)  
3. On return to `redirectUrl`: poll `GET /api/payments/:paymentId` until terminal status  
4. Also listen for `PAYMENT_SUCCEEDED` / `PAYMENT_FAILED` notifications  

### Statuses

| Status | Meaning | FE |
| --- | --- | --- |
| `PENDING` | Created / waiting | Spinner |
| `REQUIRES_ACTION` | User must finish PSP UI | Open checkoutUrl |
| `SUCCEEDED` | Paid | Enable “Apply” |
| `FAILED` | Hard fail | Show `failureReason`, retry new deposit |
| `EXPIRED` / `CANCELLED` | Dead | Start over |

### Local / console mode

When backend `PAYMENTS_MODE=CONSOLE`:

```http
POST /api/payments/:paymentId/complete-console
Authorization: Bearer <token>
```

Flips the payment to `SUCCEEDED` without Fapshi/Stripe. **Ship a hidden/dev-only button**, never in production builds.

### Other reads

```http
GET /api/payments/mine
GET /api/payments/:paymentId
```

---

## 2. Applications & purchase offers

Requires a **succeeded** deposit whose `paymentId` you pass. One payment → one application (unique).

### Types

| `type` | Listing must be | Extra fields |
| --- | --- | --- |
| `RENTAL_APPLICATION` | `RENT` | optional `proposedMoveInAt` |
| `PURCHASE_OFFER` | `SALE` | **required** `offerAmountMinor` |

### Submit

```http
POST /api/applications
```

**Rental**

```json
{
  "paymentId": "<succeeded payment id>",
  "type": "RENTAL_APPLICATION",
  "message": "I would like to rent starting next month. Budget matches the ask.",
  "proposedMoveInAt": "2026-12-01T00:00:00.000Z",
  "currency": "XAF"
}
```

**Purchase**

```json
{
  "paymentId": "<succeeded payment id>",
  "type": "PURCHASE_OFFER",
  "message": "Cash offer with flexible closing.",
  "offerAmountMinor": 40000000,
  "currency": "XAF"
}
```

| Field | Rules |
| --- | --- |
| `paymentId` | Succeeded deposit for that listing, owned by caller |
| `message` | min 10 |
| `offerAmountMinor` | required for `PURCHASE_OFFER`, int ≥ 1 |
| `currency` | optional, default `XAF` |
| `proposedMoveInAt` | optional ISO date |

Owner notified: `APPLICATION_SUBMITTED` → `/listings/:listingId/applications/:applicationId`.

### Application status machine

```
SUBMITTED / UNDER_REVIEW
    ├── owner ACCEPTED  → ACCEPTED (+ deal)
    ├── owner REJECTED  → REJECTED
    └── applicant withdraw → WITHDRAWN
```

Active = `SUBMITTED` | `UNDER_REVIEW`.

### Endpoints

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/applications` | Applicant |
| `GET` | `/api/applications/mine` | Applicant |
| `GET` | `/api/listings/:listingId/applications` | Owner |
| `POST` | `/api/applications/:id/decide` | Owner |
| `POST` | `/api/applications/:id/withdraw` | Applicant |

### Decide

```http
POST /api/applications/:applicationId/decide

{
  "status": "ACCEPTED",
  "decisionReason": "Best fit for move-in date"
}
```

`status` must be `ACCEPTED` or `REJECTED`.  
`decisionReason` optional (min 3 if sent).

### On ACCEPTED (important)

Backend atomically:

1. Creates a **deal** (`LEASE` if rental, `SALE_AGREEMENT` if purchase)  
2. Sets listing → `UNDER_CONTRACT`  
3. Auto-rejects other active applications on that listing  
4. Returns application payload including **`dealId`**  
5. Notifies applicant `APPLICATION_ACCEPTED` with href `/deals/:dealId`  

**FE:** navigate owner + applicant to the deal screen using `dealId`.

### Application row shape

```json
{
  "id": "…",
  "listingId": "…",
  "applicantUserId": "…",
  "paymentId": "…",
  "type": "RENTAL_APPLICATION",
  "status": "SUBMITTED",
  "message": "…",
  "offerAmountMinor": null,
  "currency": "XAF",
  "proposedMoveInAt": "2026-12-01T00:00:00.000Z",
  "decisionReason": null,
  "decidedByUserId": null,
  "decidedAt": null,
  "createdAt": "…",
  "updatedAt": "…",
  "dealId": null
}
```

(`dealId` present after accept on decide response.)

---

## 3. Deals

Created only by accepting an application — there is no `POST /deals`.

### Types / statuses

| Type | From |
| --- | --- |
| `LEASE` | `RENTAL_APPLICATION` |
| `SALE_AGREEMENT` | `PURCHASE_OFFER` |

| Status | Meaning |
| --- | --- |
| `ACTIVE` | In progress; listing `UNDER_CONTRACT` |
| `COMPLETED` | Done; listing `ARCHIVED` |
| `CANCELLED` | Fell through; listing re-`PUBLISHED` |

### Endpoints

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/api/deals/mine` | Owner **or** counterparty |
| `GET` | `/api/deals/:dealId` | Participant only |
| `POST` | `/api/deals/:dealId/complete` | Listing owner/manager |
| `POST` | `/api/deals/:dealId/cancel` | Owner/manager **or** counterparty |

### Deal object

```json
{
  "id": "…",
  "listingId": "…",
  "applicationId": "…",
  "ownerUserId": "…",
  "counterpartyUserId": "…",
  "type": "LEASE",
  "status": "ACTIVE",
  "amountMinor": 350000,
  "currency": "XAF",
  "startsAt": "2026-12-01T00:00:00.000Z",
  "endsAt": null,
  "notes": null,
  "cancelledReason": null,
  "activatedAt": "…",
  "closedAt": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

`amountMinor` = offer amount for purchases, else listing price.

### Complete

```http
POST /api/deals/:dealId/complete
{ "notes": "Keys handed over; lease started." }
```

`notes` optional (min 3 if sent). Counterparty gets `DEAL_COMPLETED`.

### Cancel

```http
POST /api/deals/:dealId/cancel
{ "reason": "Applicant withdrew after acceptance." }
```

`reason` **required** (min 3). Other party gets `DEAL_CANCELLED`. Listing returns to market.

### While deal is ACTIVE

Listing is `UNDER_CONTRACT`:

- Hidden from public browse  
- Cannot edit / publish / archive via listing APIs  
- FE should deep-link management to the deal screen  

---

## Screen checklist

### Seeker

- [ ] “Pay deposit” → channel/currency picker → open checkout  
- [ ] Dev-only “Complete console payment” when applicable  
- [ ] “Apply” disabled until payment `SUCCEEDED`  
- [ ] Offer amount field only for `SALE` listings  
- [ ] After accept notification → `/deals/:id`  

### Owner

- [ ] Applications inbox per listing  
- [ ] Accept confirms “this rejects other applicants + takes listing off market”  
- [ ] Deal detail: Complete / Cancel with reason  
- [ ] Hide listing edit while `UNDER_CONTRACT`  

---

## Booking E2E checklist (non-demo listing)

Use a **real** published listing (`isDemo: false`). Bambili campus demos (`seed_listing_demo_bambili_*`) must stay non-bookable.

| Step | Action | Expect |
| --- | --- | --- |
| 1 | Seeker opens listing detail | `depositAvailability.status` is `AVAILABLE` (or `PAID` / `OPEN_CHECKOUT` if already in funnel) |
| 2 | Inquire (`POST /listings/:id/inquiries`) | Inquiry `OPEN`; optional `whatsappContinueUrl` |
| 3 | Schedule viewing (`POST …/appointments`) | Appointment `REQUESTED` / `CONFIRMED` — blocked if `isDemo` |
| 4 | `GET /payments/quotes/deposit?listingId=` | Line items + `totalMinor`; `rentPeriod` / `note` when annual or academic-year rent |
| 5 | `POST /payments/deposits` with quote totals | `PENDING` / `REQUIRES_ACTION` + `checkoutUrl` in LIVE; console complete only in CONSOLE mode |
| 6 | Payment `SUCCEEDED` | `depositAvailability.status: PAID` |
| 7 | `POST /applications` with `paymentId` | Application created; owner can accept → deal |

**Copy rules**

- Platform payment = **listing deposit hold only**. Never market “pay rent / utilities via MYKWATTA”.
- Academic-year listings: price label = academic-year rent; deposit quote is still the platform hold.

---

## LIVE payment + client API URL readiness

| Check | Where | Pass criteria |
| --- | --- | --- |
| `PAYMENTS_MODE=LIVE` | API env (staging/prod) | MoMo checkout URLs are real Fapshi links (not console-only) |
| Fapshi keys + webhook URL | API secrets / Dokploy | Webhooks reach `/api/payments/webhooks/…` and mark `SUCCEEDED` |
| `NEXT_PUBLIC_API_URL` | **Client build-time** | Production builds bake `https://api.mykwatta.com` (rebuild required after change) |
| CORS | API | Client origin allowed |
| Demo CTAs | Client | Hide book/deposit when `isDemo` or `depositAvailability.reason === DEMO` |
| CONSOLE mode | Staging/dev only | Show clear non-production messaging; never imply LIVE MoMo |
