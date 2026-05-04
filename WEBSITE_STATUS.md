# WEBSITE_STATUS.md — Overline Platform Status Guide

> Last updated: 2026-05-04

## ✅ Working Features

### User Web (`apps/user-web`)
- **Authentication**: Phone OTP login (Firebase), Google OAuth, email signup
- **Explore**: City-based shop discovery, search, trending shops
- **Shop Profile**: Full shop detail page with services, staff, photos, reviews, hours
- **Booking Flow**: Service selection → Cart → Date/Slot → Confirm → Live tracking
- **Booking Detail**: Status tracking, verification code, queue position, live timer
- **Counter-Offer**: Staff proposes new time → User Accept/Reject flow
- **One-Active-Booking**: Users blocked from creating a second booking while one is active
- **Chat**: Real-time pre-service chat between user and shop (PENDING/CONFIRMED)
- **Service Timer**: Live elapsed timer during IN_PROGRESS/IN_SERVICE
- **Reviews**: Submit review after completed booking (one review per booking)
- **Notifications**: In-app notification feed with mark-as-read
- **Wallet**: Balance display, transaction history
- **Theme**: Light/Dark mode toggle with M3 semantic tokens
- **SEO**: Server-side rendering, sitemap, JSON-LD structured data
- **Sitemap**: Auto-generated with `isShopPubliclyListable()` filter

### Admin Web (`apps/admin-web`)
- **Dashboard**: Revenue, bookings, queue stats overview
- **Queue Management**: Live queue with approve/start/complete actions
- **Propose Time**: Counter-offer modal with notes for customer
- **Service Timer**: Inline elapsed timer for in-progress bookings
- **Staff Management**: Add/edit/remove staff, assign services
- **Service Menu**: Full CRUD for services with pricing and duration
- **Working Hours**: Set shop operating hours
- **Settings**: Shop profile, branding, configuration

### Backend (`apps/backend`)
- **Auth**: JWT + refresh tokens, Firebase phone OTP, Google OAuth
- **Bookings**: Full lifecycle (PENDING → CONFIRMED → IN_PROGRESS → COMPLETED)
- **Counter-Offer**: PATCH `/bookings/:id/respond-counter-offer` with slot re-validation
- **One-Active-Booking**: Server-side constraint in `BookingsService.create()`
- **Queue**: Redis-backed real-time queue with Socket.IO
- **Notifications**: De-duplicated, status-aware copy ("Placed" vs "Confirmed")
- **Payments**: Razorpay integration (order creation, verification)
- **Reviews**: One-per-booking guard
- **Slot Engine**: Availability calculation with conflict detection

### Mobile User (`apps/mobile-user`)
- **Authentication**: Phone OTP login
- **Explore**: Shop discovery with map
- **Booking**: Service selection and confirmation
- **Profile**: User profile management

---

## ⚠️ Partially Working / Known Issues

| Feature | Status | Notes |
|---------|--------|-------|
| `/shops/undefined` | ✅ Fixed | Redirects to `/explore` via `getServerSideProps` |
| Notification duplicates | ✅ Fixed | De-duplication guard by booking ID + title |
| Booking copy mismatch | ✅ Fixed | Shows "Booking Placed!" for PENDING statuses |
| Map rendering | ⚠️ | Occasional hydration issues in Next.js SSR |
| Email notifications | ⚠️ | Requires SendGrid API key in production |
| SMS notifications | ⚠️ | Currently mock/no-op — needs provider integration |
| WhatsApp OTP | ⚠️ | Requires Meta Business API credentials |
| Redis dependency | ⚠️ | Falls back gracefully but queue features degrade |

---

## ❌ Not Yet Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| Admin/Staff mobile bottom nav | Medium | Dashboard/Queue/Bookings/Profile tabs |
| Show client phone to staff | Medium | During confirm → service-start window |
| Client live location on staff side | Low | Staff-side map showing user approach |
| Payment gateway (full flow) | High | Razorpay integration exists but needs production keys |
| Offer/Promo code system | Low | Backend schema exists, UI not wired |
| Blog CMS | Low | Static `/blog` route exists, no CMS |
| Push notifications (FCM) | Medium | Firebase config exists, delivery not wired |
| Multi-language support | Low | Not started |
| Analytics dashboard | Low | Not started |

---

## 🏗️ Architecture

```
apps/
├── backend/          NestJS + Prisma + Redis + Socket.IO
├── user-web/         Next.js (Pages Router) — customer portal
├── admin-web/        Next.js (Pages Router) — shop owner/staff portal
├── mobile-user/      React Native (Expo) — customer mobile app
└── api/              Shared API documentation
```

### Key Design Decisions
- **M3 Semantic Tokens**: All UI uses CSS custom properties (`--md-sys-color-*`) for theme consistency
- **One-active-booking**: Enforced at both backend (Prisma query) and frontend (cart block)
- **Notification de-duplication**: Single DB row per notification event, fan-out across channels
- **Chat lifecycle**: Enabled pre-service (PENDING/PENDING_APPROVAL/CONFIRMED), disabled post-start
- **Status-aware copy**: "Booking Placed!" for pending, "Booking Confirmed!" for confirmed

---

## 🔧 Environment Variables Required

### Backend
```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
FIREBASE_PROJECT_ID=
SENDGRID_API_KEY=        # optional
RAZORPAY_KEY_ID=         # optional
RAZORPAY_KEY_SECRET=     # optional
CLOUDINARY_CLOUD_NAME=   # optional
CLOUDINARY_API_KEY=      # optional
CLOUDINARY_API_SECRET=   # optional
```

### Frontend (user-web / admin-web)
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=      # Socket.IO endpoint
NEXT_PUBLIC_SITE_URL=    # for sitemap/SEO
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
NEXT_PUBLIC_FIREBASE_*=  # Firebase config keys
```
