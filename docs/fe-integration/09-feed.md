# 09 — Video feed (platform-curated)

TikTok-style vertical feed of **Mykwatta-verified** listings (photos and/or video). Owners upload media; they do **not** create posts. The platform activates a feed post when a listing is `PUBLISHED` + `verificationStatus=VERIFIED` + has ≥1 `PHOTO` or ≥1 `VIDEO` (and is not trust-frozen / duplicate).

Bookmarks reuse saved listings (`POST /listings/:id/save`).

---

## Product rules

| Rule | Detail |
| --- | --- |
| Who posts | Platform only (sync job). No `POST /feed` create endpoint. |
| Eligibility | `PUBLISHED` ∧ `VERIFIED` ∧ not frozen ∧ not duplicate ∧ ≥1 `VIDEO` |
| Media | Optional `video` (`mp4` / `webm`) + `photos[]` gallery. Photo-only posts have `video: null`. Poster = first photo. |
| Comments | Max depth **2** (root + replies). No reply-to-reply. |
| Likes | Post likes and comment likes are separate toggles. |
| Shares | `POST …/share` records an event and returns `shareUrl` for the native share sheet. |

### Owner → feed preview path

```
Upload PHOTO + VIDEO on listing
→ POST /listings/:id/publish (needs KYC + ≥1 media)
→ Admin PATCH /admin/listings/:id/verification { status: VERIFIED }
→ Feed post appears on GET /feed (Pusher public-feed may fire)
```

After seed locally: Bastos + Bonanjo are already on the feed (`seed_feed_bastos`, `seed_feed_bonanjo`).

---

## Screen map

| Screen | APIs |
| --- | --- |
| Vertical feed | `GET /feed?cursor&limit`, optional `GET /feed/realtime` |
| Single post deep link | `GET /feed/:feedPostId` |
| Engagement | like / comments / comment like / share / listing save |
| Owner / agency profile | `GET /profiles/users/:id` (+ `/feed`), `GET /profiles/organisations/:id` (+ `/feed`) |
| Owner media | `POST /listings/:id/media` with `kind=VIDEO` |

---

## Feed card

```http
GET /api/feed?limit=20
GET /api/feed?limit=20&cursor=2026-11-09T10:00:00.000Z|seed_feed_bastos
```

Auth optional. When signed in, `liked` and `bookmarked` reflect the viewer.

```json
{
  "success": true,
  "data": [
    {
      "id": "seed_feed_bastos",
      "listingId": "seed_listing_bastos_rent",
      "publishedAt": "…",
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
        "url": "console://…",
        "contentType": "video/mp4"
      },
      "poster": {
        "mediaId": "seed_media_bastos_hero",
        "url": "console://…",
        "contentType": "image/jpeg"
      },
      "photos": [
        {
          "mediaId": "seed_media_bastos_hero",
          "url": "console://…",
          "contentType": "image/jpeg"
        }
      ],
      "owner": {
        "id": "seed_user_landlord",
        "name": "…",
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

**Cursor:** opaque `publishedAtIso|id`. Pass `meta.nextCursor` as `cursor` for the next page. Do not use offset pagination.

**Gallery:** use `photos[]` for swipeable listing photos. Show the video player only when `video` is non-null. `poster` mirrors `photos[0]` when present.

---

## Engagement

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/feed/:feedPostId/like` | required | Toggle post like → `{ liked, likeCount }` |
| GET | `/api/feed/:feedPostId/comments` | optional | Root comments only (`page`/`limit`) |
| POST | `/api/feed/:feedPostId/comments` | required | Body `{ body }` or `{ body, parentCommentId }` |
| GET | `/api/feed/comments/:commentId/replies` | optional | Replies for a root |
| POST | `/api/feed/comments/:commentId/like` | required | Toggle comment like |
| DELETE | `/api/feed/comments/:commentId` | author or admin | Soft-hide; hiding a root also hides replies |
| POST | `/api/feed/:feedPostId/share` | optional | `{ shareUrl, shareCount }` |
| POST/DELETE | `/api/listings/:listingId/save` | required | Bookmark |

### Comment item

```json
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
```

`replyCount` is present on roots only. Expand replies via `GET /feed/comments/:commentId/replies`.

---

## Profiles

```http
GET /api/profiles/users/:userId
GET /api/profiles/users/:userId/feed?cursor&limit
GET /api/profiles/organisations/:organisationId
GET /api/profiles/organisations/:organisationId/feed?cursor&limit
```

Public fields only (no phone/email). Profile includes `listingCount` + `feedPostCount`. Org includes `licenceVerified: boolean`.

---

## Realtime (public feed)

```http
GET /api/feed/realtime
```

```json
{
  "mode": "CONSOLE",
  "key": null,
  "cluster": null,
  "channel": "public-feed",
  "event": "feed.post"
}
```

| `mode` | FE |
| --- | --- |
| `CONSOLE` | Skip SDK; pull-to-refresh / poll `GET /feed` |
| `LIVE` | Subscribe to public channel `public-feed`, event `feed.post` — payload `{ feedPostId, listingId, publishedAt }`. Prefetch card or prepend after `GET /feed/:id`. |

No `/pusher/auth` for this channel.

Private user notifications for comments still use [05-notifications.md](./05-notifications.md) (`FEED_COMMENT_ON_YOUR_LISTING`, `FEED_COMMENT_REPLY` → `href` `/feed/:feedPostId`).

---

## Deep links

| Path | Screen |
| --- | --- |
| `/feed` | Main vertical feed |
| `/feed/:feedPostId` | Open on a specific card |
| `/profiles/users/:userId` | Owner profile + their posts |
| `/profiles/organisations/:organisationId` | Agency profile + their posts |

---

## Owner video upload

See [02-listings.md](./02-listings.md) media section. Use multipart:

| Part | Notes |
| --- | --- |
| `file` | `video/mp4` or `video/webm` |
| `kind` | `VIDEO` (required for videos) |
| `caption` / `sortOrder` | optional |

Photos stay `jpeg`/`png`/`webp`, max 8MB. Videos max **50MB**, max **3** per listing. Total media cap remains **12**.

---

## Checklist

- [ ] Vertical pager uses `GET /feed` + `meta.nextCursor`
- [ ] Swipe gallery uses `photos[]`; video player when `video` is set (photo-only OK)
- [ ] Like / comment / share / bookmark wired; bookmark via listing save
- [ ] Comment sheet: roots → expand replies; reject nesting beyond depth 2 in UI
- [ ] Profile taps navigate to `/profiles/users|organisations/…`
- [ ] Live mode: subscribe `public-feed` / `feed.post` (or poll in CONSOLE)
- [ ] Owner flow: upload `kind=VIDEO` before expecting a feed card after verification
