FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Generate Prisma client and build
WORKDIR /app/apps/backend
RUN pnpm exec prisma generate
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
