# 03 — Inquiries, appointments & reviews

All endpoints in this guide require `Authorization: Bearer <token>` unless noted. Create responses may include `whatsappContinueUrl` — see [07-trust-geo-escrow.md](./07-trust-geo-escrow.md) §6.

---

## Inquiries (leads)

A seeker asks about a **published** listing. Owner replies or closes. Appointments are scheduled **from an inquiry**.

### Status machine

```
OPEN ──respond──► RESPONDED ──close──► CLOSED
  │                  │
  └──────close───────┘
```

### Endpoints

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/listings/:listingId/inquiries` | Seeker | Create lead |
| `GET` | `/api/listings/:listingId/inquiries` | Owner / manager | Leads for one listing |
| `GET` | `/api/inquiries/mine` | Seeker | My outbound inquiries |
| `GET` | `/api/inquiries/inbox` | Owner | All leads across my listings |
| `POST` | `/api/inquiries/:inquiryId/respond` | Owner | Reply |
| `POST` | `/api/inquiries/:inquiryId/close` | Owner | Close thread |

### Create

```http
POST /api/listings/seed_listing_bastos_rent/inquiries
Content-Type: application/json

{
  "message": "Is this still available for viewing this weekend?",
  "contactPhone": "+237670000004"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `message` | yes | min 10 chars |
| `contactPhone` | no | E.164 if present |

Owner receives `INQUIRY_CREATED` → deep link `/listings/:listingId/inquiries/:inquiryId`.

### Respond

```http
POST /api/inquiries/:inquiryId/respond

{
  "responseMessage": "Yes — Saturday at 10am works. Shall I confirm a slot?"
}
```

`responseMessage` min 5 chars. Seeker gets `INQUIRY_RESPONDED` → `/inquiries/mine?inquiryId=…`.

### Typical row shape

```json
{
  "id": "…",
  "listingId": "seed_listing_bastos_rent",
  "inquirerUserId": "seed_user_renter",
  "message": "…",
  "contactPhone": "+237670000004",
  "status": "OPEN",
  "responseMessage": null,
  "respondedAt": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### FE UX

- Listing detail CTA: “Ask a question” (auth gate)  
- Owner: inbox badge from notifications + `/inquiries/inbox`  
- From `OPEN`/`RESPONDED`: show “Request viewing” → appointments  

---

## Appointments (viewings)

Must be created from an inquiry the seeker owns.

### Status machine

```
REQUESTED ──confirm──► CONFIRMED ──complete──► COMPLETED
    │                      │
    ├──decline──► DECLINED │
    └──cancel───► CANCELLED◄── cancel (either party while active)
```

### Endpoints

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/inquiries/:inquiryId/appointments` | Seeker (inquiry owner) |
| `GET` | `/api/listings/:listingId/appointments` | Owner / manager |
| `GET` | `/api/appointments/mine` | Seeker |
| `POST` | `/api/appointments/:id/confirm` | Owner |
| `POST` | `/api/appointments/:id/decline` | Owner |
| `POST` | `/api/appointments/:id/cancel` | Either participant |
| `POST` | `/api/appointments/:id/complete` | Owner |

### Schedule

```http
POST /api/inquiries/:inquiryId/appointments

{
  "scheduledAt": "2026-11-10T10:00:00.000Z",
  "durationMinutes": 30,
  "locationNote": "Meet at the main gate",
  "notes": "Prefer morning if possible"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `scheduledAt` | yes | ISO-8601 |
| `durationMinutes` | no | default 30, range 15–240 |
| `locationNote` | no | max 500 |
| `notes` | no | max 1000 |

Owner notified: `APPOINTMENT_REQUESTED` → `/appointments/:id`.

### Decline

```http
POST /api/appointments/:id/decline
{ "reason": "That slot conflicts with another viewing" }
```

`reason` min 3 / max 500.

### Notifications

| Event | Type | Deep link |
| --- | --- | --- |
| New request | `APPOINTMENT_REQUESTED` | `/appointments/:id` |
| Confirm / decline / cancel | `APPOINTMENT_CONFIRMED` / `_DECLINED` / `_CANCELLED` | `/appointments/:id` or `/appointments/mine` |

### FE UX

- Calendar card: time + duration + status chip  
- Owner actions: Confirm / Decline (with reason modal)  
- Seeker: Cancel while `REQUESTED`/`CONFIRMED`  
- After viewing: Complete (owner) → optional review prompt  

---

## Reviews

### Public list (no auth required)

```http
GET /api/listings/:listingId/reviews
```

### Authenticated write

```http
POST   /api/listings/:listingId/reviews
PATCH  /api/listings/:listingId/reviews/:reviewId
DELETE /api/listings/:listingId/reviews/:reviewId
```

### Create body

```json
{
  "rating": 5,
  "comment": "Clean apartment, responsive landlord."
}
```

| Field | Rules |
| --- | --- |
| `rating` | int 1–5 |
| `comment` | min 5 chars |

### Business rules

- One review per user per listing  
- Cannot review your own listing  
- Listing should be public/meaningful in product UX (API still validates ownership)

---

## Suggested navigation

```
Listing detail
  ├─ Ask question → Inquiry thread
  │                    └─ Request viewing → Appointment detail
  ├─ Save / unsave
  └─ Reviews list + write review (if eligible)
```

Owner home:

```
Inbox (inquiries)
Appointments to confirm
Listings → per-listing leads
```

---

## Checklist

- [ ] Inquiry create only on `PUBLISHED` listings  
- [ ] Appointment schedule only from an inquiry the user owns  
- [ ] Decline always collects a reason  
- [ ] Notification taps use `metadata.href`  
- [ ] Review form validates 1–5 + min comment length before submit  
