# Deploy (GHCR → Dokploy webhook)

| Branch | Image tag | GitHub Environment | Environment secret |
| --- | --- | --- | --- |
| `staging` | `:staging` | `staging` | `DOKPLOY_WEBHOOK_URL_STAGING` |
| `main` | `:latest` | `production` | `DOKPLOY_WEBHOOK_URL_MAIN` |

PRs only run lint/build/test (no push/deploy).

## Fix your GitHub env secrets

- **staging** env → `DOKPLOY_WEBHOOK_URL_STAGING` = Dokploy **staging** webhook  
- **production** env → `DOKPLOY_WEBHOOK_URL_MAIN` = Dokploy **prod** webhook  

Do **not** put the staging webhook secret on production.

Optional: restrict each environment’s **Deployment branches** to `staging` / `main`.

## Dokploy

- Staging app image: `ghcr.io/<owner>/mykwatta:staging`  
- Prod app image: `ghcr.io/<owner>/mykwatta:latest`  
- Registry: `ghcr.io` + GitHub PAT (`read:packages`)
