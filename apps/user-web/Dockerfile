# User Web Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps

WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/user-web/package.json ./apps/user-web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/user-web/node_modules ./apps/user-web/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/user-web ./apps/user-web
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml ./

# Build shared package
RUN cd packages/shared && pnpm build

# Build Next.js app
WORKDIR /app/apps/user-web
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
