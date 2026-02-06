# Backend Dockerfile - Run from repository root
FROM node:20-alpine

WORKDIR /app

# Install pnpm and openssl
RUN npm install -g pnpm && apk add --no-cache openssl

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Copy prisma schema BEFORE install (needed for postinstall)
COPY apps/backend/prisma ./apps/backend/prisma

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build
WORKDIR /app/apps/backend
RUN NODE_OPTIONS='--max-old-space-size=2048' pnpm build

# Production
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
