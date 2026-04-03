# Quick Reference Guide

## 🚀 Getting Started

### Documentation Files (Read These First)
1. **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Overview of all changes
2. **[docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)** - Database structure & queries
3. **[docs/ADMIN_ONBOARDING.md](docs/ADMIN_ONBOARDING.md)** - Admin dashboard walkthrough
4. **[docs/FRAUD_DETECTION.md](docs/FRAUD_DETECTION.md)** - Security & fraud prevention

---

## 📁 Key Files Changed/Created

### Backend Changes

**New Modules:**
```
apps/backend/src/modules/google/
├── google-places.service.ts      ← Google Places API integration
├── google.module.ts              ← NestJS module export
└── index.ts                       ← Module exports
```

**Modified Files:**
```
apps/backend/src/modules/auth/
├── auth.service.ts               ← Added GooglePlacesService integration
├── auth.controller.ts            ← Fixed Google OAuth callback (fixed duplicate variables)
└── auth.module.ts                ← Added GoogleModule import

apps/backend/prisma/
├── schema.prisma                 ← Added shop verification fields
└── migrations/20260301000000_add_shop_verification/
    └── migration.sql             ← Database schema updates
```

**Database:**
```
Tables Updated:
├── shops                         ← Added 7 verification fields
│   ├── isGoogleVerified
│   ├── isCustomerVerified
│   ├── googlePlaceId
│   ├── googleRating
│   ├── googleReviewsCount
│   ├── verificationStatus
│   └── verifiedAt

Indexes Added:
├── shops_google_place_id_idx
└── shops_verification_status_idx
```

---

## 🔑 Environment Variables

Add to `.env` in backend:
```bash
# Google Places API - Get from https://console.cloud.google.com/
GOOGLE_PLACES_API_KEY=<your_api_key>

# Google OAuth (already configured if you did login)
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>

# Razorpay Route + platform fee
RAZORPAY_ROUTE_ENABLED=true
RAZORPAY_ACCOUNT_NUMBER=<your_platform_account_number>
PLATFORM_FEE_PERCENT=2
```

---

## 📊 Database Query Examples

### Check Shop Verification Status
```typescript
// Get all verified shops
const verifiedShops = await prisma.shop.findMany({
  where: { isGoogleVerified: true },
  select: {
    id: true,
    name: true,
    googleRating: true,
    googleReviewsCount: true,
    verificationStatus: true,
  },
});

// Get pending verification
const pendingShops = await prisma.shop.findMany({
  where: { verificationStatus: 'PENDING' },
});

// Get fully verified (both Google and Customer)
const fullyVerified = await prisma.shop.findMany({
  where: { verificationStatus: 'FULLY_VERIFIED' },
});
```

### Update Shop Verification (Admin)
```typescript
// Mark as customer verified
await prisma.shop.update({
  where: { id: shopId },
  data: {
    isCustomerVerified: true,
    verificationStatus: 'FULLY_VERIFIED',
    verifiedAt: new Date(),
    verificationNotes: 'Customer verified - 50+ bookings completed',
  },
});
```

### Get User Statistics
```typescript
// User trust score and booking history
const userStats = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    trustScore: true,
    totalBookings: true,
    completedBookings: true,
    noShowBookings: true,
    cancelledBookings: true,
  },
});
```

---

## 🔄 Registration Flow

### What Happens When Shop Owner Registers

```
1. POST /api/v1/auth/register-shop
   ↓
2. Fraud Detection Check
   ├─ Velocity check (too many signups from same IP?)
   ├─ Bad IP list check
   └─ Phone validation
   ↓
3. Email/Phone Uniqueness Check
   ↓
4. [NEW] Google Places Verification
   ├─ Search Google Places API
   ├─ Match on name + address + phone
   └─ Fetch rating, reviews, coordinates
   ↓
5. Create Tenant (Business) → User (Owner) → Shop (Location)
   ↓
6. Set Verification Status
   ├─ If found on Google: GOOGLE_VERIFIED
   └─ If not: PENDING (wait for customer bookings)
   ↓
7. Create Default Hours, Queue Stats, Services
   ↓
8. Return Tokens + Welcome Message
   ↓
9. Redirect to Admin Dashboard with Onboarding Wizard
```

### Verification Status Timeline

```
Registration
    └─→ PENDING (default)
            ├─ Customer books & completes service
            │  └─→ CUSTOMER_VERIFIED
            │      └─→ FULLY_VERIFIED ✓✓
            │
            └─ Google Places check finds shop
               └─→ GOOGLE_VERIFIED ✓
                   ├─ Still waiting for customers
                   └─→ FULLY_VERIFIED ✓✓
```

---

## 🛡️ Fraud Detection Features

### What Gets Checked

**On Signup/Registration:**
- Rapid signup attempts (velocity check)
- Known bad IPs
- Disposable email domains
- Suspicious phone patterns

**On Login:**
- Failed login attempts (brute force)
- New device/IP detection
- Unusual login times (2-6 AM)
- Bot detection (user agent)
- IP reputation

**On Booking:**
- User trust score
- Booking velocity
- New account detection
- Suspicious patterns
- Guest booking rate limits

### Risk Levels

| Score | Level | Action |
|-------|-------|--------|
| 0-39 | LOW | Allow ✓ |
| 40-59 | MEDIUM | Allow with monitoring |
| 60-79 | HIGH | Challenge (2FA/email verify) |
| 80+ | CRITICAL | Block 🚫 |

### How Trust Score Works

```
Trust Score = 100 - (penalties)

Penalties:
- Each no-show: -10 points
- Each cancellation: -5 points
- Failed bookings: -15 points

Boosts:
- 5 completed bookings: +10 points
- No-show free month: +20 points
- Verified email/phone: +5 points each

Range: 0-100 (100 = perfect user)
```

---

## 🎯 Key API Endpoints

### Authentication
```
POST   /api/v1/auth/signup              - Register customer
POST   /api/v1/auth/login               - Login customer
POST   /api/v1/auth/register-shop       - Register shop owner
GET    /api/v1/auth/google/callback     - Google OAuth callback
POST   /api/v1/auth/refresh             - Refresh token
POST   /api/v1/auth/logout              - Logout
POST   /api/v1/auth/change-password     - Change password
```

### Shops
```
GET    /api/v1/shops                    - List all shops
GET    /api/v1/shops/:id                - Get shop details
PUT    /api/v1/shops/:id                - Update shop
GET    /api/v1/shops/:id/verification   - Check verification status
```

### Bookings
```
POST   /api/v1/bookings                 - Create booking
GET    /api/v1/bookings/:id             - Get booking details
PUT    /api/v1/bookings/:id             - Update booking
GET    /api/v1/bookings/user/:userId    - User's bookings
```

---

## 🎨 Frontend Components

### Admin Website (`apps/admin-web/`)

**Pages:**
- `/auth/register` - Shop owner registration
- `/dashboard` - Main dashboard
- `/shop/settings` - Shop details & verification
- `/services` - Service management
- `/staff` - Staff management
- `/appointments` - Booking management
- `/analytics` - Analytics & reports

**Key Components:**
- VerificationBadge - Shows verification status
- ShopCard - Shop preview with badges
- OnboardingWizard - First-time setup
- FraudAlert - High-risk customer warning

### User Website (`apps/user-web/`)

**Pages:**
- `/` - Home with featured shops
- `/search` - Shop search & filter
- `/shop/:id` - Shop details with ratings
- `/auth/login` - User login

**Key Features:**
- Shop verification badges
- Google ratings display
- Location map integration
- Trust score indicators (high-risk shops)

---

## 🚀 Deployment Checklist

- [ ] Enable Google Places API in Google Cloud Console
- [ ] Add `GOOGLE_PLACES_API_KEY` to production `.env`
- [ ] Run `npx prisma migrate deploy` on production DB
- [ ] Verify all new schema fields exist: 
  ```bash
  psql $DATABASE_URL -c "\d shops"
  ```
- [ ] Test shop registration with Google-listed business
- [ ] Test shop registration with non-Google business
- [ ] Verify admin dashboard shows verification status
- [ ] Test customer booking → verification flow
- [ ] Monitor fraud detection logs first month

---

## 🧪 Testing Scenarios

### Test Case 1: Register Google-Verified Shop
```
1. Register with real business listed on Google
   Name: McDonald's
   Address: Specific McDonald's location
   
2. Expected: 
   - "Google Verified" badge immediately
   - Rating/reviews pre-populated
   - Coordinates auto-corrected
```

### Test Case 2: Register Non-Google Shop
```
1. Register with new/unlisted business
   Name: John's New Salon
   Address: New location
   
2. Expected:
   - "Pending" status
   - No Google badge
   - Waiting for customer verification
```

### Test Case 3: Fraud Detection
```
1. Attempt rapid registrations from same IP
   
2. Expected:
   - After 3-5 attempts: flagged
   - After 10+ attempts: blocked
```

### Test Case 4: Trust Score
```
1. Create user with bookings
2. Mark 3 as "NO_SHOW"
3. Check trust score (should be reduced)
4. Try booking high-risk service
5. Expected: Warning badge on high-risk user
```

---

## 📈 Monitoring & Maintenance

### Metrics to Track

```
SELECT 
  COUNT(*) as total_shops,
  COUNT(CASE WHEN is_google_verified THEN 1 END) as google_verified,
  COUNT(CASE WHEN is_customer_verified THEN 1 END) as customer_verified,
  verification_status,
  COUNT(*) as count
FROM shops
GROUP BY verification_status;
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Google verification not working | Check API key, rate limits |
| Location not auto-correcting | Google Places API might be returning different result |
| "PENDING" shops not converting to verified | Might need manual verification or customer bookings |
| High false positives on fraud | Adjust thresholds in FraudDetectionService |

---

## 📞 Support Documentation

- **Database:** [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- **Admin Flow:** [docs/ADMIN_ONBOARDING.md](docs/ADMIN_ONBOARDING.md)
- **Security:** [docs/FRAUD_DETECTION.md](docs/FRAUD_DETECTION.md)
- **Implementation:** [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)

---

## ✅ Status

**Build Status:** ✅ PASSING  
**Database:** ✅ MIGRATED  
**Tests:** ✅ VERIFIED  
**Documentation:** ✅ COMPLETE  
**Production Ready:** ✅ YES  

---

**Last Updated:** March 1, 2026  
**Version:** 1.0.0

