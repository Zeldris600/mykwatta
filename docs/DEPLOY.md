# Deploy (GHCR → Dokploy webhook)

| Branch | Image tag | GitHub Environment | Environment secret |
| --- | --- | --- | --- |
| `staging` | `:staging` | `staging` | `DOKPLOY_WEBHOOK_URL_STAGING` |
| `main` | `:latest` | `production` | `DOKPLOY_WEBHOOK_URL_MAIN` |

## Dokploy compose (important)

Use repo file **`docker-compose.yml`** (pulls GHCR). Do **not** deploy `docker-compose.dev.yml` — that builds `Dockerfile.dev` and will fail on Dokploy.

In Dokploy env set:

```env
MYKWATTA_IMAGE=ghcr.io/zeldris600/mykwatta:staging   # or :latest for prod
```

Plus your app secrets (`DATABASE_URL`, `REDIS_URL`, …).

Provider: Docker Compose → compose file `docker-compose.yml` → registry `ghcr.io` with a PAT that can `read:packages`.

After CI pushes a new tag, the webhook redeploys and Compose pulls the new image.
