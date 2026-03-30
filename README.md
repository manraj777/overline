# Overline - Appointment & Queue Management System

A multi-tenant, low-latency appointment and queue management system for clinics, salons, and walk-in businesses.

## 🚀 Tech Stack

- **Backend**: NestJS 10, TypeScript, Prisma ORM, PostgreSQL, Redis
- **Frontend**: Next.js 14, React 18, TanStack Query v5, Zustand, Tailwind CSS
- **Infrastructure**: Docker, GitHub Actions CI/CD

## 📦 Monorepo Structure

```
Overline/
├── apps/
│   ├── backend/          # NestJS API server
│   ├── user-web/         # Customer-facing Next.js app
│   └── admin-web/        # Admin dashboard Next.js app
├── packages/
│   └── shared/           # Shared TypeScript types
├── scripts/
│   └── init-db.sql       # Database initialization
└── docker-compose.yml    # Development containers
```

## 🛠️ Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

## 🏁 Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/your-username/overline.git
cd overline
pnpm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker compose up -d
```

### 3. Configure Environment

```bash
# Backend environment
cp apps/backend/.env.example apps/backend/.env
# Update DATABASE_URL, JWT secrets, etc.
```

### 4. Setup Database

```bash
cd apps/backend

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed demo data
pnpm prisma db seed
```

### 5. Start Development Servers

```bash
# From root directory - start all apps
pnpm dev

# Or start individually:
pnpm --filter @overline/backend dev     # Backend on :3001
pnpm --filter @overline/user-web dev    # User app on :3000
pnpm --filter @overline/admin-web dev   # Admin app on :3002
```

## 🔑 Default Credentials

After seeding, use these credentials:

**Admin Dashboard** (`localhost:3002`):
- Email: `owner@example.com`
- Password: `password123`

**User App** (`localhost:3000`):
- Email: `customer@example.com`
- Password: `password123`

## 📡 API Documentation

Swagger UI available at: `http://localhost:3001/docs`

## 🏗️ Architecture

### Backend Modules

| Module | Description |
|--------|-------------|
| `auth` | JWT authentication with refresh tokens |
| `users` | User management |
| `shops` | Multi-tenant shop management |
| `services` | Service catalog |
| `queue` | Real-time queue & slot engine |
| `bookings` | Appointment booking |
| `payments` | Razorpay integration |
| `notifications` | SMS/Push notifications |
| `analytics` | Business analytics |
| `admin` | Admin dashboard APIs |

### Database Schema

- **Multi-tenancy**: Row-level isolation via `tenantId`
- **Caching**: Redis for queue states, sessions
- **Soft deletes**: Supported on critical models

## 🐳 Docker Deployment

### Development

```bash
docker compose up -d
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `JWT_SECRET` | Access token secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `RAZORPAY_KEY_ID` | Razorpay API key |
| `RAZORPAY_SECRET` | Razorpay secret |
| `NEXT_PUBLIC_API_URL` | Public API base URL for web apps |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

## 🧪 Testing

```bash
# Run backend tests
cd apps/backend && pnpm test

# Run e2e tests
cd apps/backend && pnpm test:e2e
```

## 📱 Features

### Customer App
- Browse shops by category/location
- Book appointments with preferred staff
- Real-time queue position tracking
- Online payments
- Booking history & management

### Admin Dashboard
- Real-time queue management
- Appointment calendar
- Service & staff management
- Revenue analytics
- Customer insights

## 🛣️ Roadmap

- [ ] Mobile apps (React Native)
- [ ] WhatsApp integration
- [ ] Loyalty program
- [ ] Multi-location support
- [ ] Advanced analytics

## 📄 License

MIT License - see LICENSE file for details.
