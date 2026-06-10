# 🏗️ Overline: System Architecture Workflow

> [!NOTE]
> This document provides the high-level architecture of the Overline platform. It is designed to be read by AI Assistants to quickly understand the core technology stack without exposing sensitive production keys or infrastructure endpoints.

## 1. Technology Stack
The project is structured as a **pnpm monorepo**.
- **Backend API**: NestJS, Prisma (PostgreSQL), Swagger (OpenAPI).
- **Web Frontend**: Next.js (React), Tailwind CSS.
- **Mobile Frontend**: React Native (Expo), Nativewind, Axios.

## 2. Monorepo Structure
- `apps/backend/` - The core API and Database ORM.
- `apps/admin-web/` - Superadmin and Platform Operations dashboard.
- `apps/mobile-admin/` - React Native app for Shop Owners.
- `apps/mobile-user/` - React Native app for End Users (Customers).
- `packages/` - Shared libraries (if any).

## 3. Core Database Entities (Prisma)
The database uses Prisma and PostgreSQL. Do not alter the schema without running `npx prisma migrate dev`.
- **User**: Represents all platform accounts (End Users, Shop Owners, Super Admins). Differentiated by `role`.
- **Shop**: Represents a business listing. Has many `Services`, `Staff`, and `Bookings`.
- **Service**: Offerings within a shop (e.g., Haircut, Massage).
- **Staff**: Employees of a shop assigned to specific services.
- **Booking**: Central entity tracking an appointment. Has states: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- **Payment**: Tracks transactional statuses linked to a Booking.
- **PromoCode**: Superadmin-controlled discount codes.

## 4. Authentication Flow
- **Customers**: Phone Number + OTP (via Firebase/Twilio).
- **Shop Owners**: Phone/Email based login.
- **Superadmin**: Strict Email matching (`manraj.gupta@overline.in`) with Google OAuth or strong password.
- **Authorization**: Managed via NestJS `@UseGuards(JwtAuthGuard, RolesGuard)`.

## 5. Security & Safety Guidelines
> [!WARNING]
> Do NOT hardcode production database URLs, Supabase API keys, or Firebase server keys in the codebase.
> Always use `process.env` or `@nestjs/config` for accessing secrets.
> Do NOT expose internal booking logs to the public API without strict User ID validation.
