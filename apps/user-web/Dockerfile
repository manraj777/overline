# User Web Dockerfile
FROM node:22-alpine AS base

# Install pnpm v9 to match lockfile version
RUN npm install -g pnpm@9

# Builder stage
FROM base AS builder

WORKDIR /app

# Copy workspace configuration and install deps
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/user-web/package.json ./apps/user-web/

RUN pnpm install --frozen-lockfile

# Copy source files
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/user-web ./apps/user-web

# Build shared package first
RUN cd packages/shared && pnpm build

# Build Next.js app (DOCKER_BUILD enables standalone output in next.config.js)
WORKDIR /app/apps/user-web
ENV DOCKER_BUILD=true
RUN pnpm build

# Production stage
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/user-web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/user-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/user-web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
