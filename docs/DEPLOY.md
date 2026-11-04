# Deploy (GHCR → Dokploy webhook)

| Branch | Image tag | Webhook secret |
| --- | --- | --- |
| `staging` | `ghcr.io/<owner>/mykwatta:staging` | `DOKPLOY_WEBHOOK_URL_STAGING` |
| `main` | `ghcr.io/<owner>/mykwatta:latest` | `DOKPLOY_WEBHOOK_URL_MAIN` (or legacy `DOKPLOY_WEBHOOK_URL`) |

PRs only run lint/build/test (no push/deploy).

## Dokploy

- **Staging app:** image `…:staging` + staging webhook  
- **Prod/main app:** image `…:latest` + main webhook  
- Registry: `ghcr.io` + GitHub PAT (`read:packages`)
