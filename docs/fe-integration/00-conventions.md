# 00 — Conventions

## HTTP client setup

```ts
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSessionToken(); // your secure storage
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    credentials: 'include', // useful for web same-origin cookie sessions
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json);
  }

  // Most Nest routes: { success: true, data: T }
  return json.data as T;
}
```

**Do not** send `Content-Type: application/json` on `FormData` uploads (KYC, listing media).

## Success envelope

Almost every Nest handler is wrapped:

```json
{
  "success": true,
  "data": { }
}
```

### Paginated lists

```json
{
  "success": true,
  "data": {
    "data": [ /* items */ ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 42
    }
  }
}
```

Unwrap as: `const page = await api<…>(…); const rows = page.data; const meta = page.meta`.

### Exceptions (not wrapped)

| Endpoint | Returns |
| --- | --- |
| `POST /api/notifications/pusher/auth` | Raw `{ "auth": "…" }` for Pusher SDK |
| Better Auth routes under `/api/auth/*` | Better Auth’s own JSON (not Nest envelope) |

## Error envelope

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": ["city must be longer than or equal to 2 characters"],
  "details": "Bad Request",
  "timestamp": "2026-11-02T14:57:26.597Z",
  "path": "/api/listings?city=",
  "requestId": "01a19cc4-…"
}
```

| Field | Use |
| --- | --- |
| `statusCode` | HTTP status |
| `code` | Stable machine code for branching |
| `message` | String **or** string[] (class-validator) |
| `requestId` | Support / logging |

### Codes you should handle

| Code | Typical cause | FE action |
| --- | --- | --- |
| `VALIDATION_FAILED` / `BAD_REQUEST` | Bad query/body | Inline field errors |
| `UNAUTHORIZED` | Missing/expired session | Re-login |
| `FORBIDDEN` | Persona / ownership | Hide CTA or show upgrade copy |
| `NOT_FOUND` | Wrong id or private resource | 404 screen (do not leak existence) |
| `CONFLICT` | Duplicate slug, active deal, etc. | Explain conflict |
| `DATABASE_ERROR` / `EXTERNAL_ERROR` | Server/PSP failure | Retry / toast |

## Authentication

| Mechanism | When |
| --- | --- |
| `Authorization: Bearer <token>` | **Preferred** for mobile + Swagger |
| Cookie `better-auth.session_token` | Browser same-site after OTP verify |

Obtain token: see [01-auth-identity.md](./01-auth-identity.md) (`set-auth-token` header or signup `data.token`).

Optional-auth routes still work anonymously; pass Bearer when logged in so you get `saved: true/false`.

## Money

All money fields are **integers in minor units** — never floats.

| Currency | Minor unit | Example |
| --- | --- | --- |
| `XAF` | 1 franc (0 decimals) | `350000` → 350,000 XAF |
| `USD` | 1 cent (2 decimals) | `5000` → $50.00 |
| `EUR` | 1 cent (2 decimals) | `9900` → €99.00 |

Display helper: divide by `10 ** decimalPlaces` for USD/EUR; leave XAF as-is.

Fields: `priceMinor`, `amountMinor`, `offerAmountMinor`, `minPriceMinor`, `maxPriceMinor`.

## Enums (always UPPER_SNAKE / UPPERCASE)

Send exactly these strings. Do not camelCase or lowercase.

### Identity

- Personas: `RENTER` · `BUYER` · `LANDLORD` · `AGENT` · `CARETAKER` · `CONSTRUCTION_CLIENT` · `DEVELOPER` · `INVESTOR` · `PLATFORM_ADMIN` (staff only)
- Org roles: `OWNER` · `ADMIN` · `PROPERTY_MANAGER` · `AGENT` · `ACCOUNTANT` · `CARETAKER` · `MEMBER`

### Listings

- Status: `DRAFT` · `PUBLISHED` · `UNDER_CONTRACT` · `ARCHIVED`
- Type: `RENT` · `SALE`
- Property: `APARTMENT` · `HOUSE` · `STUDIO` · `DUPLEX` · `LAND` · `COMMERCIAL` · `OTHER`

### Engagement

- Inquiry: `OPEN` · `RESPONDED` · `CLOSED`
- Appointment: `REQUESTED` · `CONFIRMED` · `DECLINED` · `CANCELLED` · `COMPLETED`

### Money / funnel

- Payment channel: `MOBILE_MONEY` · `CARD`
- Payment status: `PENDING` · `REQUIRES_ACTION` · `SUCCEEDED` · `FAILED` · `EXPIRED` · `CANCELLED`
- Application type: `RENTAL_APPLICATION` · `PURCHASE_OFFER`
- Application status: `SUBMITTED` · `UNDER_REVIEW` · `ACCEPTED` · `REJECTED` · `WITHDRAWN`
- Deal type: `LEASE` · `SALE_AGREEMENT`
- Deal status: `ACTIVE` · `COMPLETED` · `CANCELLED`

### KYC / push / notifications

- KYC: `UNDER_REVIEW` · `APPROVED` · `REJECTED`
- Push platform: `FCM` · `APNS`
- Notification channel prefs: `PUSH` · `IN_APP` · `WHATSAPP` · `EMAIL` · `SMS`

## Phone numbers

E.164 only: `+237670000004`  
Regex enforced: `^\+[1-9]\d{7,14}$`

## Query param hygiene (Swagger footgun)

**Omit** unused optional query params. Empty strings fail validation:

```
❌ /api/listings?city=&listingType=
✅ /api/listings?city=Yaoundé
✅ /api/listings
```

Map bounds: send **all four** of `north`, `south`, `east`, `west`, or none.

## Dates

ISO-8601 UTC strings, e.g. `"2026-11-10T10:00:00.000Z"`.

## IDs

Opaque strings (nanoid-style / seed ids). Treat as opaque; do not parse structure.
