# 10 — Social sign-in (Google)

Phone OTP remains the primary path ([01-auth-identity.md](./01-auth-identity.md)). Google is an alternate **sign-in / sign-up** when the API has `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.

## Mental model

- Browser (or WebView) starts OAuth with Better Auth → Google → API callback → redirect back to **your** app
- Session is still an opaque token → `Authorization: Bearer <token>` (same as phone OTP)
- New Google users get persona **`RENTER`** by default; change later with `PATCH /api/identity/me/personas`
- `phoneNumber` may be `null` until the user links a phone (product decision)
- Account linking is on for Google: same verified email can attach to an existing user

Google is **disabled** if either env var is missing (provider not registered).

---

## Google Cloud Console

| Field | Value |
| --- | --- |
| Application type | Web application |
| **Authorized JavaScript origins** | Origin only — no path, no trailing `/` |
| | `https://api.mykwatta.com` |
| | `https://your-web-app.example` (every UI origin) |
| | `http://localhost:3000` / `http://localhost:3005` (local) |
| **Authorized redirect URIs** | Full callback path (no trailing `/`) |
| | `{BETTER_AUTH_URL}/api/auth/callback/google` |
| | e.g. `https://api.mykwatta.com/api/auth/callback/google` |
| | e.g. `http://localhost:3005/api/auth/callback/google` |

API env:

```env
BETTER_AUTH_URL=https://api.mykwatta.com
GOOGLE_CLIENT_ID=….apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=…
CORS_ORIGIN=https://your-web-app.example,http://localhost:3000
```

`callbackURL` you pass from the client **must** be listed in `CORS_ORIGIN` / Better Auth `trustedOrigins` (same list).

---

## Web flow

```
POST /api/auth/sign-in/social   (get Google authorize URL)
        ↓
  redirect browser to Google
        ↓
  Google → GET {BETTER_AUTH_URL}/api/auth/callback/google
        ↓
  API redirects to your callbackURL?set-auth-token=<SESSION_TOKEN>
        ↓
  Store token → GET /api/identity/me (same bootstrap as phone)
```

### Step 1 — Start Google

```http
POST /api/auth/sign-in/social
Content-Type: application/json
Accept: application/json

{
  "provider": "google",
  "callbackURL": "https://your-web-app.example/signin",
  "disableRedirect": true
}
```

**Success (200):**

```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?…",
  "redirect": false
}
```

Navigate the browser to `url` (`window.location.assign(url)`).

Use `disableRedirect: true` so the response is JSON you can read (instead of an HTTP `Location` to Google).

`callbackURL` = absolute URL of the page that should receive the session (usually your sign-in route). You may include a `next` query param for post-login navigation; the API will preserve query params when appending the token.

### Step 2 — Capture token on return

After Google, the API redirects to:

```text
https://your-web-app.example/signin?set-auth-token=<SESSION_TOKEN>
```

(Optionally with your other query params still present.)

1. Read `set-auth-token` from the query string  
2. Store it the same way as phone OTP (`set-auth-token` header / Bearer storage)  
3. Strip it from the URL (`history.replaceState`) — do not leave the token in history/shareable links  
4. Bootstrap:

```http
GET /api/identity/me
Authorization: Bearer <SESSION_TOKEN>
```

### Step 3 — Personas (optional)

New Google users are created with **`RENTER`**. If sign-up UI collected personas first, apply them after the token is stored:

```http
PATCH /api/identity/me/personas
Authorization: Bearer <SESSION_TOKEN>
Content-Type: application/json

{ "personas": ["RENTER", "BUYER"] }
```

Then refresh `/api/identity/me`.

---

## Copy-paste client sketch (web)

```ts
async function startGoogleSignIn(callbackURL: string) {
  const res = await fetch(`${API}/api/auth/sign-in/social`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL,
      disableRedirect: true,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json?.url) throw new Error(json?.message ?? "Google sign-in failed");
  window.location.assign(json.url);
}

// On /signin mount:
const token = new URLSearchParams(location.search).get("set-auth-token");
if (token) {
  // persist token → Authorization: Bearer …
  const url = new URL(location.href);
  url.searchParams.delete("set-auth-token");
  history.replaceState({}, "", url);
  await fetch(`${API}/api/identity/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

---

## Mobile

Prefer **native Google Sign-In** → ID token, then:

```http
POST /api/auth/sign-in/social
Content-Type: application/json

{
  "provider": "google",
  "idToken": {
    "token": "<GOOGLE_ID_TOKEN>",
    "accessToken": "<optional>"
  }
}
```

Success returns session JSON (and typically `set-auth-token` header) — **no browser redirect**. Store the Bearer token like phone verify.

Register the iOS/Android OAuth client IDs in the same Google Cloud project. Web redirect URI above is still required for the web path.

---

## Errors / edge cases

| Symptom | Likely cause |
| --- | --- |
| `redirect_uri_mismatch` | Google Console redirect ≠ `{BETTER_AUTH_URL}/api/auth/callback/google` |
| Provider not found / 404 | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` missing on API |
| Callback blocked / origin error | `callbackURL` origin not in `CORS_ORIGIN` |
| Landed on app with no token | Old API without social bearer redirect, or bookmark without query |
| Duplicate email conflict | Existing phone account with same email; linking should attach Google when email is verified — if it fails, sign in with phone first then link |

Sign-out stays `POST /api/auth/sign-out` with Bearer (see [01](./01-auth-identity.md)).

---

## Checklist

- [ ] Google Console origins = hosts only; redirect URI = full `/api/auth/callback/google`  
- [ ] API has `GOOGLE_*` + matching `BETTER_AUTH_URL`  
- [ ] FE `callbackURL` is absolute and in `CORS_ORIGIN`  
- [ ] FE reads `set-auth-token` query, stores Bearer, strips from URL  
- [ ] `/api/identity/me` after Google; handle `phoneNumber: null`  
- [ ] Optional: persona picker → `PATCH /api/identity/me/personas`  
