# Production image for API + worker (same image, different CMD).
#   docker build -t ghcr.io/<owner>/mykwatta:latest .
#   docker run … ghcr.io/<owner>/mykwatta:latest
#   docker run … ghcr.io/<owner>/mykwatta:latest node dist/src/worker.js

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm run build \
  && pnpm prune --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

USER nestjs
EXPOSE 3000

# Override in Dokploy for the worker: node dist/src/worker.js
CMD ["node", "dist/src/main.js"]
