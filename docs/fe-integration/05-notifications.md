# 05 — Notifications

Covers in-app inbox, Pusher realtime, mobile push device registry, and preference/consent toggles.

All routes require Bearer auth.  
**Exception:** `POST /pusher/auth` returns a **raw** Pusher body (not the Nest `{ success, data }` envelope).

---

## Inbox

### List

```http
GET /api/notifications?page=1&limit=20&unreadOnly=false
```

| Query | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | 1 | |
| `limit` | int 1–100 | 20 | |
| `unreadOnly` | bool | false | `true` / `1` accepted |

### Unread badge

```http
GET /api/notifications/unread-count
```

```json
{ "success": true, "data": { "unread": 3 } }
```

Use `data.unread` for the badge.

### Mark read

```http
POST /api/notifications/:notificationId/read
POST /api/notifications/read-all
```

### Row shape

```json
{
  "id": "…",
  "userId": "seed_user_renter",
  "type": "APPLICATION_ACCEPTED",
  "title": "Application accepted",
  "body": "Your application for \"2-bedroom apartment in Bastos\" was accepted.",
  "entityType": "APPLICATION",
  "entityId": "…",
  "metadata": {
    "href": "/deals/deal_abc",
    "listingId": "seed_listing_bastos_rent",
    "listingTitle": "2-bedroom apartment in Bastos",
    "applicationId": "…",
    "dealId": "deal_abc",
    "paymentId": "…",
    "actorUserId": "seed_user_landlord"
  },
  "readAt": null,
  "createdAt": "2026-11-02T16:00:00.000Z"
}
```

### Deep links (`metadata.href`) — source of truth

| `type` | `href` pattern |
| --- | --- |
| `INQUIRY_CREATED` | `/listings/:listingId/inquiries/:inquiryId` |
| `INQUIRY_RESPONDED` | `/inquiries/mine?inquiryId=:inquiryId` |
| `APPOINTMENT_REQUESTED` | `/appointments/:appointmentId` |
| `APPOINTMENT_CONFIRMED` / `_DECLINED` / `_CANCELLED` | `/appointments/:appointmentId` |
| `PAYMENT_SUCCEEDED` / `_FAILED` | `/listings/:listingId/payments/:paymentId` |
| `APPLICATION_SUBMITTED` | `/listings/:listingId/applications/:applicationId` |
| `APPLICATION_ACCEPTED` | `/deals/:dealId` (fallback `/applications/:id`) |
| `APPLICATION_REJECTED` | `/applications/:applicationId` |
| `DEAL_COMPLETED` / `DEAL_CANCELLED` | `/deals/:dealId` |
| `FEED_COMMENT_ON_YOUR_LISTING` / `FEED_COMMENT_REPLY` | `/feed/:feedPostId` |

**On tap:** navigate to `metadata.href` first. Extra ids on `metadata` are for prefetch / analytics.

Map these app-relative paths onto your router (`/(app)/deals/[id]`, etc.).

### Entity types

`LISTING` · `INQUIRY` · `APPOINTMENT` · `PAYMENT` · `APPLICATION` · `DEAL`

---

## Realtime (Pusher)

### 1. Load client config

```http
GET /api/notifications/realtime
```

```json
{
  "mode": "CONSOLE",
  "key": null,
  "cluster": null,
  "channel": "private-user-seed_user_renter",
  "event": "notification"
}
```

| `mode` | FE behaviour |
| --- | --- |
| `CONSOLE` | Skip SDK; poll inbox / rely on pull-to-refresh |
| `LIVE` | Init Pusher with `key` + `cluster` |

### 2. Private channel auth

Pusher JS will POST to your auth endpoint. Wire it to:

```http
POST /api/notifications/pusher/auth
Authorization: Bearer <token>
Content-Type: application/json

{
  "socket_id": "123.456",
  "channel_name": "private-user-<userId>"
}
```

**Response (raw, HTTP 200):**

```json
{ "auth": "<pusher-auth-string>" }
```

Not wrapped in `{ success, data }`. Channel must equal `private-user-<the logged-in user id>` or API returns forbidden.

### 3. Subscribe

```ts
const { key, cluster, channel, event, mode } = await api('/api/notifications/realtime');
if (mode !== 'LIVE' || !key) return;

const pusher = new Pusher(key, {
  cluster: cluster!,
  authorizer: (ch) => ({
    authorize: (socketId, callback) => {
      fetch(`${API}/api/notifications/pusher/auth`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          socket_id: socketId,
          channel_name: ch.name,
        }),
      })
        .then((r) => r.json())
        .then((data) => callback(null, data))
        .catch((err) => callback(err, null));
    },
  }),
});

const sub = pusher.subscribe(channel); // private-user-…
sub.bind(event, (payload) => {
  // payload mirrors a notification row
  incrementUnread();
  maybeShowToast(payload.title, payload.body);
  prependToInbox(payload);
});
```

Event name is always `notification`.

---

## Mobile push devices

Register after login / when FCM or APNs token rotates.

```http
GET    /api/notifications/devices
POST   /api/notifications/devices
DELETE /api/notifications/devices
```

### Register

```json
{
  "platform": "FCM",
  "token": "<device registration token>",
  "deviceId": "optional-stable-hardware-id"
}
```

| Field | Values |
| --- | --- |
| `platform` | `FCM` (Android / RN Firebase) or `APNS` (iOS) |
| `token` | min 8 chars |
| `deviceId` | optional; helps rotate tokens per device |

### Unregister (logout)

```json
{ "token": "<same token>" }
```

Local `PUSH_MODE=CONSOLE` still accepts registration; delivery is logged, not sent to Apple/Google.

---

## Preferences & consent

### Read

```http
GET /api/notifications/preferences
```

Shape:

```json
{
  "channels": {
    "PUSH": true,
    "IN_APP": true,
    "WHATSAPP": true,
    "EMAIL": true,
    "SMS": true
  },
  "types": {
    "INQUIRY_CREATED": true,
    "INQUIRY_RESPONDED": true,
    "APPOINTMENT_REQUESTED": true,
    "APPOINTMENT_CONFIRMED": true,
    "APPOINTMENT_DECLINED": true,
    "APPOINTMENT_CANCELLED": true,
    "PAYMENT_SUCCEEDED": true,
    "PAYMENT_FAILED": true,
    "APPLICATION_SUBMITTED": true,
    "APPLICATION_ACCEPTED": true,
    "APPLICATION_REJECTED": true,
    "DEAL_COMPLETED": true,
    "DEAL_CANCELLED": true
  }
}
```

### Patch (partial)

```http
PATCH /api/notifications/preferences

{
  "channels": { "SMS": false },
  "types": { "INQUIRY_CREATED": false }
}
```

Only provided keys update.

### Explicit consent endpoints

```http
POST /api/notifications/preferences/channels/PUSH/enable
POST /api/notifications/preferences/channels/whatsapp/disable
```

Channel path param is case-insensitive (`push`, `WHATSAPP`, etc.).

### How delivery works (for settings copy)

- Channel + type prefs are a **hard gate**  
- Backend then picks a **small** channel set by urgency (IN_APP + PUSH + WHATSAPP primarily; email/SMS only for critical fallbacks)  
- FE does **not** need to reimplement routing — expose clear toggles and honest labels  

Suggested settings UI:

1. Master channel switches (Push, In-app, WhatsApp, Email, SMS)  
2. Advanced: per-event type toggles  

---

## Checklist

- [ ] Badge = unread-count + realtime increments  
- [ ] Tap → `metadata.href` router map  
- [ ] Pusher only when `mode === 'LIVE'`  
- [ ] Pusher auth uses Bearer + raw JSON response  
- [ ] Register push token on login; unregister on logout  
- [ ] Preferences screen wired to GET/PATCH + enable/disable  
