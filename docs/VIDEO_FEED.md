# MYKWATTA — Video feed (complete guide)

Self-contained contract for the platform-curated TikTok-style listing video feed: product rules, APIs, payloads, realtime, profiles, owner video upload, bookmarks, notifications, deep links, and local seed data.

| | |
| --- | --- |
| Local API | `http://localhost:3000` |
| Global prefix | `/api` |
| Swagger | `http://localhost:3000/api/docs` |
| Envelope | Success responses use `{ success: true, data, meta? }` (Nest interceptor). Errors use the standard API error body. |
| Auth | `Authorization: Bearer <session token>` when required. Routes marked optional work anonymously; viewer flags (`liked`, `bookmarked`) need a session. |

Money is always integer **minor units** (`priceMinor`) with `currency` (e.g. `XAF`).

---

## 1. Product rules

| Rule | Detail |
| --- | --- |
| Who posts | **Mykwatta only.** There is no user “create post” endpoint. |
| What owners do | Upload listing media (`PHOTO` / `VIDEO`). Publish the listing. Wait for platform verification. |
| Feed eligibility | Listing must be `PUBLISHED` **and** `verificationStatus = VERIFIED` **and** not trust-frozen **and** not marked duplicate **and** have ≥1 `PHOTO` **or** ≥1 `VIDEO`. |
| Photo-only listings | Allowed. Sync activates a feed post with `video: null` and a `photos[]` gallery. |
| If later ineligible | Existing post is set `HIDDEN` (unverify, archive, freeze, duplicate, or all photos **and** videos removed). |
| Media on a card | `video` may be null. Always include `photos[]` (listing `PHOTO`s in sort order). `poster` = first photo (`photos[0]`). FE: photo carousel and/or video player. Raw `mp4`/`webm` when present, signed URLs, no HLS. |
| Bookmarks | Reuse listing save APIs. Feed cards expose `bookmarked`. |
| Comments | Nested threads, **max depth 2** (root + one level of replies). No reply-to-reply. No comment editing in MVP. |
| Likes | Post likes and comment likes are separate toggles. No like notifications. |
| Shares | Backend records a share event and returns `shareUrl`. FE owns the native share sheet. |
| Ranking | Chronological by `publishedAt` descending (then `id`). No ML ranking in MVP. |

### Owner → feed preview path

```
1. Owner: KYC approved
2. Owner: POST /api/listings (draft)
3. Owner: POST /api/listings/:id/media  (PHOTO and/or VIDEO)
4. Owner: POST /api/listings/:id/publish
5. Admin: PATCH /api/admin/listings/:id/verification  { "status": "VERIFIED" }
6. Platform sync creates/activates feed post (photo-only or with video)
7. FE: GET /api/feed  (or Pusher public-feed event → GET /api/feed/:feedPostId)
```

---

## 2. Screen map

| Screen | Primary APIs |
| --- | --- |
| Vertical feed | `GET /api/feed`, optional `GET /api/feed/realtime` |
| Open on a card | `GET /api/feed/:feedPostId` |
| Engagement bar | like, comments, share, bookmark (listing save) |
| Comment sheet | root comments → expand replies; comment like; delete own |
| Owner profile | `GET /api/profiles/users/:userId` + `/feed` |
| Agency profile | `GET /api/profiles/organisations/:organisationId` + `/feed` |
| Owner media studio | `POST /api/listings/:listingId/media` with `kind=VIDEO` |

Suggested app routes (FE-owned):

| Path | Screen |
| --- | --- |
| `/feed` | Main vertical feed |
| `/feed/:feedPostId` | Deep link onto a card |
| `/profiles/users/:userId` | Owner profile |
| `/profiles/organisations/:organisationId` | Agency profile |

---

## 3. Feed read API

### List (cursor)

```http
GET /api/feed?limit=20
GET /api/feed?limit=20&cursor=2026-11-09T10:00:00.000Z|seed_feed_bastos
```

| Query | Type | Default | Notes |
| --- | --- | --- | --- |
| `limit` | int 1–50 | 20 | Page size |
| `cursor` | string | — | Opaque `publishedAtIso\|id` from previous `meta.nextCursor` |

Auth: optional.

Only `ACTIVE` posts are returned.

```json
{
  "success": true,
  "data": [
    {
      "id": "seed_feed_bastos",
      "listingId": "seed_listing_bastos_rent",
      "publishedAt": "2026-11-09T10:00:00.000Z",
      "likeCount": 0,
      "commentCount": 0,
      "shareCount": 0,
      "liked": false,
      "bookmarked": false,
      "listing": {
        "id": "seed_listing_bastos_rent",
        "title": "2-bedroom apartment in Bastos",
        "listingType": "RENT",
        "propertyType": "APARTMENT",
        "priceMinor": 350000,
        "currency": "XAF",
        "city": "Yaoundé",
        "neighborhood": "Bastos",
        "verificationStatus": "VERIFIED",
        "listingVerified": true,
        "isPremium": false
      },
      "video": {
        "mediaId": "seed_media_bastos_video",
        "url": "console://mykwatta-listings/…?expires=3600",
        "contentType": "video/mp4"
      },
      "poster": {
        "mediaId": "seed_media_bastos_hero",
        "url": "console://mykwatta-listings/…?expires=3600",
        "contentType": "image/jpeg"
      },
      "photos": [
        {
          "mediaId": "seed_media_bastos_hero",
          "url": "console://mykwatta-listings/…?expires=3600",
          "contentType": "image/jpeg"
        }
      ],
      "owner": {
        "id": "seed_user_landlord",
        "name": "Landlord Demo",
        "image": null
      },
      "organisation": null
    }
  ],
  "meta": {
    "limit": 20,
    "nextCursor": null
  }
}
```

**Pagination:** use keyset cursor only. When `meta.nextCursor` is non-null, pass it as `cursor` for the next page. Do not use offset/`page` on the feed list.

**Media URLs:** `video?.url`, `poster.url`, and every `photos[].url` are short-lived signed URLs (TTL **3600s**). Re-fetch the card or feed when they expire. `video` is `null` for photo-only posts. `photos` is always an array (may be empty only if a video exists). `poster` is `photos[0]` or `null`. FE should support a horizontal swipe / gallery over `photos`, and a video player when `video` is present.

**Organisation on card** (when the listing belongs to an agency):

```json
"organisation": {
  "id": "seed_org_capital_homes",
  "name": "Capital Homes",
  "slug": "capital-homes",
  "licenceVerified": true
}
```

### Single post

```http
GET /api/feed/:feedPostId
```

Auth: optional. Same card shape as one element of `data` above. `404` if missing or `HIDDEN`.

---

## 4. Engagement

### Post like (toggle)

```http
POST /api/feed/:feedPostId/like
Authorization: Bearer <token>
```

```json
{ "success": true, "data": { "liked": true, "likeCount": 1 } }
```

Call again to unlike → `liked: false`.

### Share

```http
POST /api/feed/:feedPostId/share
```

Auth: optional (anonymous shares allowed; `userId` stored when signed in).

```json
{
  "success": true,
  "data": {
    "shareUrl": "http://localhost:3001/feed/seed_feed_bastos",
    "shareCount": 1
  }
}
```

`shareUrl` is built from the configured public web origin + `/feed/:feedPostId`. FE should open the OS/share sheet with that URL.

### Bookmark (saved listing)

```http
POST   /api/listings/:listingId/save
DELETE /api/listings/:listingId/save
GET    /api/listings/saved
```

Auth: required. Personas: typically seeker personas (`RENTER` / `BUYER`). Cannot save your own listing. Listing must be `PUBLISHED`.

Feed cards map this to `bookmarked` using `listingId` on the card. After save/unsave, update local card state or refetch.

---

## 5. Comments (threaded)

Constraints:

- Body: trimmed string, **1–500** characters
- Roots: `parentCommentId` omitted
- Replies: `parentCommentId` = **root** comment id only (reject if parent is itself a reply)
- Soft-delete: `DELETE` hides the comment; hiding a **root** also hides its ACTIVE replies and decrements `commentCount` accordingly
- Author or platform admin may delete

### List root comments

```http
GET /api/feed/:feedPostId/comments?page=1&limit=20
```

Auth: optional.

| Query | Default | Max |
| --- | --- | --- |
| `page` | 1 | — |
| `limit` | 20 | 50 |

```json
{
  "success": true,
  "data": [
    {
      "id": "…",
      "feedPostId": "seed_feed_bastos",
      "parentCommentId": null,
      "body": "Is this still available?",
      "likeCount": 0,
      "liked": false,
      "replyCount": 2,
      "createdAt": "…",
      "author": { "id": "…", "name": "…", "image": null }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

`replyCount` is only on roots.

### List replies

```http
GET /api/feed/comments/:commentId/replies?page=1&limit=20
```

Auth: optional. `commentId` must be a root. Same item shape without `replyCount` (or treat as leaf).

### Create root or reply

```http
POST /api/feed/:feedPostId/comments
Authorization: Bearer <token>
Content-Type: application/json
```

Root:

```json
{ "body": "Is this still available?" }
```

Reply:

```json
{
  "body": "Yes — free this weekend.",
  "parentCommentId": "<rootCommentId>"
}
```

Returns the created comment item (with `replyCount: 0` for new roots).

### Comment like (toggle)

```http
POST /api/feed/comments/:commentId/like
Authorization: Bearer <token>
```

```json
{ "success": true, "data": { "liked": true, "likeCount": 1 } }
```

### Hide / delete comment

```http
DELETE /api/feed/comments/:commentId
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": { "deleted": true, "id": "…", "hiddenCount": 3 }
}
```

---

## 6. Profiles

Public fields only — **never** phone or email.

### User profile

```http
GET /api/profiles/users/:userId
```

```json
{
  "success": true,
  "data": {
    "id": "seed_user_landlord",
    "name": "Landlord Demo",
    "image": null,
    "listingCount": 1,
    "feedPostCount": 1
  }
}
```

### User’s feed posts

```http
GET /api/profiles/users/:userId/feed?limit=20&cursor=…
```

Same card list shape as `GET /api/feed` (`data` + `meta.nextCursor`). Auth optional for `liked` / `bookmarked`.

### Organisation profile

```http
GET /api/profiles/organisations/:organisationId
```

```json
{
  "success": true,
  "data": {
    "id": "seed_org_capital_homes",
    "name": "Capital Homes",
    "slug": "capital-homes",
    "licenceVerified": true,
    "listingCount": 1,
    "feedPostCount": 1
  }
}
```

### Organisation’s feed posts

```http
GET /api/profiles/organisations/:organisationId/feed?limit=20&cursor=…
```

Same card list shape as the main feed.

---

## 7. Owner video upload

Listing media kinds: `PHOTO` | `FLOOR_PLAN` | `VIDEO`.

```http
GET    /api/listings/:listingId/media
POST   /api/listings/:listingId/media
DELETE /api/listings/:listingId/media/:mediaId
```

### Upload video

```http
POST /api/listings/:listingId/media
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Part | Required | Notes |
| --- | --- | --- |
| `file` | yes | `video/mp4` or `video/webm` |
| `kind` | **yes for video** | Must be `VIDEO` |
| `caption` | no | max 200 |
| `sortOrder` | no | int ≥ 0; defaults to next slot |

| Limit | Value |
| --- | --- |
| Video size | **50 MB** |
| Photo size | **8 MB** (`jpeg` / `png` / `webp`) |
| Max videos / listing | **3** |
| Max media items / listing | **12** (all kinds) |
| Signed URL TTL | **3600** seconds |

Video MIME without `kind=VIDEO` is rejected. Non-video MIME with `kind=VIDEO` is rejected.

Uploading or deleting `PHOTO`/`VIDEO` after verification re-runs feed sync. Removing the last photo **and** last video hides the post.

Publish still requires ≥1 media of any kind (plus approved KYC). Feed visibility additionally requires admin `VERIFIED` plus ≥1 photo or video.

### Admin verification (platform)

```http
PATCH /api/admin/listings/:id/verification
Authorization: Bearer <platform admin token>
Content-Type: application/json
```

```json
{ "status": "VERIFIED", "note": "Docs checked" }
```

Allowed statuses include `PENDING` | `VERIFIED` | `REJECTED` (and listing may start `UNVERIFIED`). Only `VERIFIED` (with the other gates) puts the listing on the feed.

---

## 8. Realtime

### Public feed channel (new drops)

```http
GET /api/feed/realtime
```

Auth: optional. No private-channel auth endpoint needed for this channel.

```json
{
  "mode": "CONSOLE",
  "key": null,
  "cluster": null,
  "channel": "public-feed",
  "event": "feed.post"
}
```

| `mode` | FE behaviour |
| --- | --- |
| `CONSOLE` | Skip Pusher SDK; pull-to-refresh or poll `GET /api/feed` |
| `LIVE` | Init Pusher with `key` + `cluster`; subscribe to `public-feed`; listen for `feed.post` |

Event payload:

```json
{
  "feedPostId": "…",
  "listingId": "…",
  "publishedAt": "2026-11-09T10:00:00.000Z"
}
```

On event: toast “New listing”, optionally `GET /api/feed/:feedPostId` and prepend if not already in the list. Always safe to refetch the first page.

### Comment notifications (private user inbox)

When someone comments on your listing or replies to your comment, the recipient gets an in-app notification (and push/WhatsApp per prefs/urgency).

| `type` | Who | `metadata.href` |
| --- | --- | --- |
| `FEED_COMMENT_ON_YOUR_LISTING` | Listing owner (not if self-comment) | `/feed/:feedPostId` |
| `FEED_COMMENT_REPLY` | Parent comment author (not if self-reply) | `/feed/:feedPostId` |

Extra metadata may include `listingId`, `listingTitle`, `feedPostId`, `commentId`, `actorUserId`, `actorName`.

Post likes and comment likes do **not** send notifications.

Private notification Pusher (separate from the public feed):

```http
GET /api/notifications/realtime
POST /api/notifications/pusher/auth
```

Uses channel `private-user-{userId}` and event `notification`. Prefer navigating to `metadata.href` on tap.

---

## 9. Endpoint cheat sheet

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/feed` | optional |
| GET | `/api/feed/realtime` | optional |
| GET | `/api/feed/:feedPostId` | optional |
| POST | `/api/feed/:feedPostId/like` | required |
| GET | `/api/feed/:feedPostId/comments` | optional |
| POST | `/api/feed/:feedPostId/comments` | required |
| POST | `/api/feed/:feedPostId/share` | optional |
| GET | `/api/feed/comments/:commentId/replies` | optional |
| POST | `/api/feed/comments/:commentId/like` | required |
| DELETE | `/api/feed/comments/:commentId` | required |
| GET | `/api/profiles/users/:userId` | optional |
| GET | `/api/profiles/users/:userId/feed` | optional |
| GET | `/api/profiles/organisations/:organisationId` | optional |
| GET | `/api/profiles/organisations/:organisationId/feed` | optional |
| POST | `/api/listings/:listingId/media` | owner (Bearer) |
| GET | `/api/listings/:listingId/media` | optional |
| DELETE | `/api/listings/:listingId/media/:mediaId` | owner |
| POST | `/api/listings/:listingId/save` | required |
| DELETE | `/api/listings/:listingId/save` | required |
| GET | `/api/listings/saved` | required |
| PATCH | `/api/admin/listings/:id/verification` | platform admin |

---

## 10. Local seed (development)

After DB seed in development/test, OTP for all demo phones is typically `000000`.

| Persona | Phone | Email |
| --- | --- | --- |
| Platform admin | `+237670000001` | `admin@mykwatta.local` |
| Landlord | `+237670000002` | `landlord@mykwatta.local` |
| Agent | `+237670000003` | `agent@mykwatta.local` |
| Renter | `+237670000004` | `renter@mykwatta.local` |
| Buyer | `+237670000005` | `buyer@mykwatta.local` |

Feed-ready seeded listings (both `PUBLISHED` + `VERIFIED` + VIDEO + PHOTO):

| Listing | Feed post | Owner / org |
| --- | --- | --- |
| `seed_listing_bastos_rent` | `seed_feed_bastos` | landlord, no org |
| `seed_listing_bonanjo_sale` | `seed_feed_bonanjo` | agent + `seed_org_capital_homes` |

Media IDs:

- `seed_media_bastos_hero` (PHOTO), `seed_media_bastos_video` (VIDEO)
- `seed_media_bonanjo_hero` (PHOTO), `seed_media_bonanjo_video` (VIDEO)

`seed_listing_akwa_draft` stays draft / unverified and is **not** on the feed.

Quick FE smoke:

```
GET /api/feed
→ open seed_feed_bastos
→ POST like / comment / share
→ GET /api/profiles/users/seed_user_landlord/feed
→ GET /api/profiles/organisations/seed_org_capital_homes/feed
```

---

## 11. FE checklist

- [ ] Vertical pager loads `GET /api/feed` and advances with `meta.nextCursor`
- [ ] Gallery swipes `photos[]`; play `video` when non-null (photo-only cards are valid); refresh on signed-URL expiry
- [ ] Optional auth: anonymous can browse; signed-in sees `liked` / `bookmarked`
- [ ] Post like toggle; comment roots → expand replies; comment like; depth capped at 2 in UI
- [ ] Share uses `shareUrl` from `POST …/share`
- [ ] Bookmark via listing save; keep card `bookmarked` in sync
- [ ] Owner/agency taps go to profile screens and their `/feed` lists
- [ ] `GET /api/feed/realtime`: CONSOLE = poll/refresh; LIVE = subscribe `public-feed` / `feed.post`
- [ ] Notification tap for feed comment types opens `/feed/:feedPostId`
- [ ] Owner upload: multipart `kind=VIDEO` + mp4/webm before expecting a feed card after admin verify

---

## 12. Out of scope (MVP)

- User-generated posts / creator UGC
- Reply-to-reply (depth > 2) and comment editing
- HLS / adaptive streaming
- Feed ranking / ML personalization
- Like notifications
- Separate bookmark table (saved listings are the source of truth)
