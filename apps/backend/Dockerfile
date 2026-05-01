# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk update && apk upgrade && apk add --no-cache python3 make g++ openssl && npm install -g pnpm@9

# Copy monorepo config first (for better layer caching)
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Create stub package.json files so pnpm workspace resolution doesn't fail
# (these workspaces exist in pnpm-lock.yaml but are excluded from Docker context)
RUN mkdir -p apps/admin-web apps/user-web apps/mobile-user apps/mobile-admin && \
    echo '{"name":"@overline/admin-web","version":"1.0.0","private":true}' > apps/admin-web/package.json && \
    echo '{"name":"@overline/user-web","version":"1.0.0","private":true}' > apps/user-web/package.json && \
    echo '{"name":"OverlineUser","version":"0.0.1","private":true}' > apps/mobile-user/package.json && \
    echo '{"name":"OverlineAdmin","version":"0.0.1","private":true}' > apps/mobile-admin/package.json

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Copy full source
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Generate Prisma client and build
WORKDIR /app/apps/backend
RUN npx prisma generate
# Clean stale tsbuildinfo to prevent incremental build cache issues
RUN rm -f *.tsbuildinfo
RUN NODE_OPTIONS='--max-old-space-size=2048' npx nest build

# Verify build output exists
RUN ls -la dist/main.js

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

RUN apk update && apk upgrade && apk add --no-cache openssl && npm install -g pnpm@9 && rm -rf /var/cache/apk/*

# Copy entire built workspace from builder (includes node_modules, dist, prisma client)
COPY --from=builder /app ./

WORKDIR /app/apps/backend

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node -r tsconfig-paths/register dist/main.js"]