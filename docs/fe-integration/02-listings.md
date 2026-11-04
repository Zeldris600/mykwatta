# 02 — Listings & discovery

Trust badges, quartier filters, amenities: [07-trust-geo-escrow.md](./07-trust-geo-escrow.md).

## Listing object (what you render)

Every listing payload (browse, detail, mine, create/update) looks like:

```json
{
  "id": "seed_listing_bastos_rent",
  "title": "2-bedroom apartment in Bastos",
  "description": "Bright furnished apartment…",
  "status": "PUBLISHED",
  "listingType": "RENT",
  "propertyType": "APARTMENT",
  "priceMinor": 350000,
  "currency": "XAF",
  "city": "Yaoundé",
  "neighborhood": "Bastos",
  "quartierId": "seed_geo_quartier_bastos",
  "verificationStatus": "UNVERIFIED",
  "trustChecklist": {
    "phoneVerified": true,
    "kycVerified": true,
    "listingVerified": false,
    "hasPhotos": true,
    "trustFrozen": false
  },
  "addressLine": "Rue 1.234",
  "countryCode": "CM",
  "latitude": 3.8856,
  "longitude": 11.5104,
  "bedrooms": 2,
  "bathrooms": 1,
  "areaSqm": 85,
  "ownerUserId": "seed_user_landlord",
  "organisationId": null,
  "publishedAt": "2026-11-02T15:00:00.000Z",
  "createdAt": "…",
  "updatedAt": "…",
  "media": [
    {
      "id": "seed_media_bastos_hero",
      "listingId": "seed_listing_bastos_rent",
      "objectKey": "listings/…/seed-hero.jpg",
      "contentType": "image/jpeg",
      "sortOrder": 0,
      "caption": "Living room",
      "url": "console://mykwatta-listings/…?expires=3600",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "saved": false
}
```

| Field | Notes |
| --- | --- |
| `media[].url` | **Short-lived signed URL** — always use this for `<Image>` / `<img>`. Refresh by re-fetching the listing when it expires. |
| `objectKey` | Internal — do not invent CDN URLs from it |
| `saved` | Present when the request is authenticated (optional auth on public routes). Anonymous → typically `false` |
| `latitude` / `longitude` | Nullable until set; required for map-bounds search |

---

## Status machine

```
DRAFT ──publish──► PUBLISHED ──archive──► ARCHIVED
                      │
                      │ application ACCEPTED
                      ▼
                 UNDER_CONTRACT ──complete deal──► ARCHIVED
                      │
                      └──cancel deal──► PUBLISHED
```

| Status | Public browse | Detail for strangers | Owner may edit | Owner may publish | Owner may archive |
| --- | --- | --- | --- | --- | --- |
| `DRAFT` | no | no (404) | yes | yes* | yes |
| `PUBLISHED` | yes | yes | yes | no-op | yes |
| `UNDER_CONTRACT` | no | no (404) | **no** | **no** | **no** (use deal APIs) |
| `ARCHIVED` | no | no (404) | **no** | **no** | no-op |

\*Publish also requires approved KYC + ≥1 photo.

---

## Public browse

```http
GET /api/listings?page=1&limit=20
```

Auth **optional**. Response:

```json
{
  "success": true,
  "data": {
    "data": [ /* listing objects with media + saved */ ],
    "meta": { "page": 1, "limit": 20, "total": 2 }
  }
}
```

Only `PUBLISHED` rows.

### Query filters

| Param | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | no (default 1) | |
| `limit` | int 1–100 | no (default 20) | |
| `city` | string ≥ 2 | no | Case-insensitive `ILIKE %city%` |
| `q` | string ≥ 2 | no | Matches title **or** description |
| `listingType` | `RENT` \| `SALE` | no | Exact |
| `propertyType` | enum | no | Exact |
| `minPriceMinor` | int ≥ 0 | no | |
| `maxPriceMinor` | int ≥ 0 | no | |
| `minBedrooms` | int ≥ 0 | no | |
| `north` | number −90…90 | with all bounds | Max latitude |
| `south` | number | with all bounds | Min latitude |
| `east` | number −180…180 | with all bounds | Max longitude |
| `west` | number | with all bounds | Min longitude |

**Map bounds rules**

- All four present → filter listings with non-null lat/lng inside the box (`south ≤ lat ≤ north`, `west ≤ lng ≤ east`)
- Partial bounds → `400` `"Map bounds require north, south, east, and west together"`
- `south > north` → `400`

**Examples**

```http
GET /api/listings?city=Yaoundé&listingType=RENT&minPriceMinor=100000&maxPriceMinor=500000
GET /api/listings?q=bastos&minBedrooms=2
GET /api/listings?north=3.95&south=3.80&east=11.60&west=11.40
```

**Do not** send empty strings for unused filters (Swagger does this by default — clear unused fields).

---

## Detail

```http
GET /api/listings/:id
```

Auth optional. Non-published listings return **404** to strangers (not 403) so ids are not leaked.

---

## Owner: my listings

```http
GET /api/listings/mine?page=1&limit=20&status filters…
Authorization: Bearer <token>
```

Same filter query as browse, but scoped to the caller’s ownership / org manage rights. Includes drafts and under-contract.

---

## Create

Requires persona `LANDLORD` | `AGENT` | `DEVELOPER`, **or** sufficient org membership.

```http
POST /api/listings
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "title": "2-bedroom apartment in Bastos",
  "description": "Bright apartment near schools and shops.",
  "listingType": "RENT",
  "propertyType": "APARTMENT",
  "priceMinor": 350000,
  "currency": "XAF",
  "city": "Yaoundé",
  "neighborhood": "Bastos",
  "addressLine": "Rue 1.234",
  "countryCode": "CM",
  "latitude": 3.8856,
  "longitude": 11.5104,
  "bedrooms": 2,
  "bathrooms": 1,
  "areaSqm": 85,
  "organisationId": null
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | min 3 |
| `description` | yes | min 10 |
| `listingType` | yes | `RENT` / `SALE` |
| `propertyType` | yes | enum |
| `priceMinor` | yes | int ≥ 0 |
| `currency` | no | default `XAF` |
| `city` | yes | min 2 |
| `neighborhood` / `addressLine` | no | |
| `countryCode` | no | default `CM` |
| `latitude` / `longitude` | no | **send for map search** |
| `bedrooms` / `bathrooms` / `areaSqm` | no | |
| `organisationId` | no | agency posting |

Starts as `DRAFT`. Returns listing + `media: []` + `saved: false`.

---

## Update

```http
PATCH /api/listings/:id
```

Partial body — same fields as create (nullable clears for some optional fields: neighborhood, address, lat/lng, beds, baths, area).

Blocked when status is `ARCHIVED` or `UNDER_CONTRACT`.

---

## Media

```http
GET    /api/listings/:listingId/media          # optional auth
POST   /api/listings/:listingId/media          # owner — multipart
DELETE /api/listings/:listingId/media/:mediaId # owner
```

### Upload

```http
POST /api/listings/:listingId/media
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Part | Required | Notes |
| --- | --- | --- |
| `file` | yes | jpeg / png / webp |
| `caption` | no | |
| `sortOrder` | no | int ≥ 0 |

Max **12** photos per listing. Publish requires **≥ 1**.

---

## Publish / archive

```http
POST /api/listings/:id/publish
POST /api/listings/:id/archive
```

### Publish fails when

| Condition | Message (approx) |
| --- | --- |
| No approved KYC on owner | KYC-related forbidden/bad request |
| Zero photos | “At least one listing photo is required…” |
| `ARCHIVED` | cannot publish |
| `UNDER_CONTRACT` | cancel the deal first |

Idempotent if already `PUBLISHED`.

### Archive

Blocked while `UNDER_CONTRACT` — complete or cancel the deal instead.

---

## Saved / shortlist

Personas: typically `RENTER` / `BUYER`.

```http
POST   /api/listings/:listingId/save
DELETE /api/listings/:listingId/save
GET    /api/listings/saved?page=1&limit=20
```

Browse/detail already include `saved` for authenticated callers — toggle optimistically then reconcile.

---

## FE screen map

| Screen | Calls |
| --- | --- |
| Home / map search | `GET /listings` + bounds/filters |
| Listing detail | `GET /listings/:id` |
| Heart / save | `POST|DELETE …/save` |
| Owner dashboard | `GET /listings/mine` |
| Create wizard | `POST /listings` → media uploads → `POST …/publish` |
| Under contract banner | Hide edit; link to `GET /deals/mine` |

---

## Checklist

- [ ] Filter bar omits empty query params  
- [ ] Map search always sends 4 bounds together  
- [ ] Image components use `media[].url`, re-fetch on expiry  
- [ ] Publish CTA checks KYC status + photo count client-side (still handle API errors)  
- [ ] `UNDER_CONTRACT` listings: no edit/publish/archive buttons  
- [ ] Anonymous browse works without Authorization header  
