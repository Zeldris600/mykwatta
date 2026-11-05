# 01 — Auth & identity

## Mental model

- **Login** = Better Auth phone OTP (`/api/auth/phone-number/*`)
- **Signup** = send OTP via Better Auth, then **our** `POST /api/identity/auth/signup` (real email + name + personas)
- **Session** = opaque token → send as `Authorization: Bearer <token>`
- **Personas** = account capabilities (many allowed). **Organisations** = optional agency layer (never required for renters)

Try endpoints interactively: http://localhost:3000/api/auth/reference

---

## Login (existing user)

### Step 1 — Send OTP

```http
POST /api/auth/phone-number/send-otp
Content-Type: application/json

{ "phoneNumber": "+237670000004" }
```

Local (`NODE_ENV=development` / `test`): always use the fixed OTP **`000000`** (override with `AUTH_DEV_OTP`). Console/worker still logs that code.

Seeded phones and what each account already owns: [08-demo-accounts.md](./08-demo-accounts.md).

### Step 2 — Verify

```http
POST /api/auth/phone-number/verify
Content-Type: application/json

{
  "phoneNumber": "+237670000004",
  "code": "000000"
}
```

**Capture the session token from the response header:**

```http
set-auth-token: <SESSION_TOKEN>
```

Also sets cookie `better-auth.session_token` (web). Mobile should **only** rely on `set-auth-token` / Bearer.

Store securely (Keychain / SecureStore / httpOnly cookie on web).

### Step 3 — Bootstrap profile

```http
GET /api/identity/me
Authorization: Bearer <SESSION_TOKEN>
```

**Response `data`:**

```json
{
  "user": {
    "id": "seed_user_renter",
    "email": "renter@mykwatta.local",
    "name": "Marie Fotso",
    "phoneNumber": "+237670000004",
    "phoneNumberVerified": true,
    "emailVerified": true,
    "personas": ["RENTER"]
  },
  "organisations": [
    {
      "id": "seed_membership_…",
      "organisationId": "seed_org_capital_homes",
      "userId": "seed_user_agent",
      "role": "OWNER",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

`organisations` is the raw memberships list (role + `organisationId`). Resolve org name/slug via your own cache or a follow-up call if the product needs it.

Gate navigation off `user.personas` + `organisations`.

---

## Signup (new user)

Do **not** use Better Auth `signUpOnVerification` — it invents email/name. Our flow:

```
POST /api/auth/phone-number/send-otp
        ↓
POST /api/identity/auth/signup
```

### Signup body

```http
POST /api/identity/auth/signup
Content-Type: application/json
```

```json
{
  "phoneNumber": "+237699112233",
  "code": "123456",
  "email": "ada@example.com",
  "name": "Ada Mbarga",
  "personas": ["LANDLORD", "INVESTOR"]
}
```

| Field | Rules |
| --- | --- |
| `phoneNumber` | E.164 |
| `code` | OTP from step 1 (min length 4) |
| `email` | Valid email (must be unique) |
| `name` | Min 2 chars |
| `personas` | Non-empty unique array from signup catalog |

### Signup response `data`

```json
{
  "user": {
    "id": "…",
    "email": "ada@example.com",
    "name": "Ada Mbarga",
    "phoneNumber": "+237699112233",
    "phoneNumberVerified": true,
    "emailVerified": false,
    "personas": ["LANDLORD", "INVESTOR"]
  },
  "token": "<SESSION_TOKEN>",
  "expiresAt": "2026-11-09T…"
}
```

Persist `token` the same way as login’s `set-auth-token`.

### Persona catalog (public)

```http
GET /api/identity/personas
```

```json
{
  "personas": [
    "RENTER", "BUYER", "LANDLORD", "AGENT", "CARETAKER",
    "CONSTRUCTION_CLIENT", "DEVELOPER", "INVESTOR"
  ]
}
```

`PLATFORM_ADMIN` is **not** in this list (staff-only; seeded).

### Update personas later

```http
PATCH /api/identity/me/personas
Authorization: Bearer <token>

{ "personas": ["RENTER", "BUYER"] }
```

Replaces the full set (not a patch-merge of single flags).

---

## Personas → UI capability map

| Persona | Typical screens |
| --- | --- |
| `RENTER` / `BUYER` | Browse, save, inquire, book viewing, deposit, apply |
| `LANDLORD` / `AGENT` / `DEVELOPER` | KYC, create/publish listings, inbox, decide applications, complete deals |
| `PLATFORM_ADMIN` | KYC review queue |
| Others | Reserved for later verticals — still selectable |

A user can hold **many** personas at once (e.g. `RENTER` + `LANDLORD`).

---

## Organisations (optional)

Never created at signup. Only for agencies / portfolios posting under an org.

### Create

```http
POST /api/identity/organisations
{ "name": "Capital Homes", "slug": "capital-homes" }
```

`slug`: lowercase kebab (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Conflict → `CONFLICT`.

Creator becomes `OWNER`.

### Memberships

```http
GET /api/identity/me/memberships
```

### Invites

```http
POST /api/identity/organisations/:organisationId/invites
{
  "email": "pm@example.com",
  "role": "PROPERTY_MANAGER"
}
```

Invitable roles: everything except `OWNER`  
(`ADMIN`, `PROPERTY_MANAGER`, `AGENT`, `ACCOUNTANT`, `CARETAKER`, `MEMBER`).

Only `OWNER` / `ADMIN` can create/revoke invites.

```http
GET  /api/identity/organisations/:organisationId/invites
POST /api/identity/invites/:inviteId/revoke
POST /api/identity/invites/accept
{ "token": "<invite token from email>" }
```

Accept requires the invitee to already be logged in (phone OTP first).

When creating a listing for an agency, pass `organisationId` on `POST /api/listings`.

---

## Session lifecycle (FE)

1. On cold start: if token exists → `GET /identity/me`. On `401` → clear token → auth screen.  
2. On every `401` from Nest: clear session, redirect to login.  
3. Logout (Better Auth): `POST /api/auth/sign-out` (cookie/Bearer as applicable), then wipe local token.  
4. Do not put the raw token in query strings or analytics.

---

## Curl recipe (renter)

```bash
# 1) OTP
curl -s -X POST http://localhost:3000/api/auth/phone-number/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"+237670000004"}'

# 2) Verify — copy set-auth-token from -i headers
curl -si -X POST http://localhost:3000/api/auth/phone-number/verify \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"+237670000004","code":"XXXXXX"}'

# 3) Me
curl -s http://localhost:3000/api/identity/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Checklist

- [ ] Login + signup both store Bearer token  
- [ ] App shell waits on `/identity/me` before role-gated tabs  
- [ ] Phone inputs force E.164  
- [ ] Persona picker uses `GET /identity/personas`  
- [ ] Org creation is a separate “Upgrade to agency” flow, not signup  
