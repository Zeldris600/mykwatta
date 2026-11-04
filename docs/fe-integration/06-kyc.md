# 06 — KYC

Publishing a listing requires the **listing owner** to have `APPROVED` KYC. Seeded landlords/agents start **without** KYC — FE must drive submit + (for local) admin approve before first publish.

---

## Status machine

```
(no record) ──submit──► UNDER_REVIEW ──admin──► APPROVED
                              │
                              └──admin──► REJECTED ──submit again──► UNDER_REVIEW
```

| Status | Owner UX |
| --- | --- |
| missing / null | “Verify identity to publish” CTA |
| `UNDER_REVIEW` | Disable publish; “Pending review” |
| `APPROVED` | Allow publish (still need photos) |
| `REJECTED` | Show reason; allow resubmit |

---

## Owner: current KYC

```http
GET /api/kyc/me
Authorization: Bearer <token>
```

Use on landlord/agent home and before the publish button.

When approved/pending, responses include a short-lived signed `documentUrl` for preview — **do not** persist object keys or craft storage URLs yourself.

---

## Owner: submit

Multipart only:

```http
POST /api/kyc/submit
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Part | Required | Notes |
| --- | --- | --- |
| `document` | yes | binary file field name **`document`** |
| `documentType` | yes | see enum |
| `documentNumber` | yes | string |
| `fullName` | yes | string |

### `documentType`

| Value | Use |
| --- | --- |
| `NATIONAL_ID` | National ID card |
| `PASSPORT` | Passport |
| `DRIVERS_LICENSE` | Driver’s license |
| `BUSINESS_REGISTRATION` | Agency / company docs |

### Example (fetch)

```ts
const form = new FormData();
form.append('document', {
  uri: file.uri,
  name: file.name ?? 'id.jpg',
  type: file.mimeType ?? 'image/jpeg',
} as any);
form.append('documentType', 'NATIONAL_ID');
form.append('documentNumber', 'ID123456');
form.append('fullName', 'Ada Mbarga');

await fetch(`${API}/api/kyc/submit`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  // no Content-Type header — let the runtime set boundary
  body: form,
});
```

After success → status `UNDER_REVIEW`.

---

## Admin: review queue (`PLATFORM_ADMIN`)

Seed admin: `+237670000001`.

```http
GET /api/kyc/queue
Authorization: Bearer <admin token>
```

Lists submissions in `UNDER_REVIEW` (with signed preview URLs).

### Decide

```http
POST /api/kyc/:userId/decide
Authorization: Bearer <admin token>
Content-Type: application/json
```

**Approve**

```json
{ "status": "APPROVED", "notes": "Docs clear" }
```

**Reject**

```json
{
  "status": "REJECTED",
  "rejectionReason": "Document photo is blurry",
  "notes": "optional internal note"
}
```

| Field | Rules |
| --- | --- |
| `status` | `APPROVED` \| `REJECTED` only |
| `rejectionReason` | **Required** when `REJECTED` (min 3) |
| `notes` | optional |

`:userId` is the **applicant’s** user id (not the KYC row id).

---

## Coupling to listings

```
GET /kyc/me  →  not APPROVED  →  block Publish, show KYC screen
POST /listings/:id/publish    →  backend re-checks KYC (don’t rely on client alone)
```

Publish also needs ≥1 photo — see [02-listings.md](./02-listings.md).

---

## Local test script

1. Login landlord `+237670000002` → submit KYC  
2. Login admin `+237670000001` → `GET /kyc/queue` → `POST /kyc/seed_user_landlord/decide` `{ "status": "APPROVED" }`  
3. Back to landlord → upload listing media → publish  

---

## Checklist

- [ ] Landlord/agent home shows KYC status chip  
- [ ] Publish disabled until `APPROVED` (+ has media)  
- [ ] Rejected state shows `rejectionReason` and resubmit  
- [ ] Multipart field name is exactly `document`  
- [ ] Admin queue only visible for `PLATFORM_ADMIN` persona  
- [ ] Never store raw storage object keys in app state beyond the session  
