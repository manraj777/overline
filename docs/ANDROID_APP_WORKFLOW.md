# Android App Development Workflow

## Overview
The Overline mobile app will provide a seamless booking experience for users and management tools for shop owners/staff.

## Recommended Tech Stack

### Option A: React Native (Recommended)
- **Why**: Share code with existing React web apps, faster development, large ecosystem
- **Framework**: React Native with Expo
- **State Management**: Zustand (same as web apps)
- **API Client**: Axios/React Query (same as web)
- **Navigation**: React Navigation
- **UI**: NativeWind (TailwindCSS for RN)

### Option B: Flutter
- **Why**: Excellent performance, beautiful UI, growing ecosystem
- **Language**: Dart
- **State Management**: Riverpod
- **UI**: Material 3

---

## Project Structure (React Native + Expo)

```
apps/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (tabs)/                   # Tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── bookings.tsx
│   │   ├── wallet.tsx
│   │   └── profile.tsx
│   ├── (auth)/                   # Auth screens
│   │   ├── login.tsx
│   │   ├── otp-verify.tsx
│   │   └── register.tsx
│   ├── shop/
│   │   ├── [id].tsx              # Shop details
│   │   └── book.tsx              # Booking flow
│   ├── booking/
│   │   ├── [id].tsx              # Booking details
│   │   └── verify-code.tsx       # 4-digit code display
│   └── _layout.tsx
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── booking/
│   ├── shop/
│   └── wallet/
├── hooks/
│   ├── useAuth.ts
│   ├── useWallet.ts
│   ├── useBookings.ts
│   └── useOtp.ts
├── services/
│   ├── api.ts                    # API client
│   ├── auth.ts
│   └── notifications.ts
├── stores/
│   ├── auth.ts
│   └── app.ts
├── utils/
│   └── helpers.ts
├── app.json
├── babel.config.js
├── package.json
└── tsconfig.json
```

---

## Key Features to Implement

### 1. User App Features
- [ ] **OTP Login/Register** - Phone verification
- [ ] **Home Screen** - Nearby shops with map view
- [ ] **Shop Discovery** - Search, filter, categories
- [ ] **Shop Details** - Services, reviews, photos, location
- [ ] **Booking Flow** - Service selection, time slot, payment type
- [ ] **4-Digit Service Code** - Display verification code prominently
- [ ] **Wallet** - Free cash balance, transaction history
- [ ] **My Bookings** - Upcoming, past, cancellation with reason
- [ ] **Push Notifications** - Booking updates, queue position

### 2. Owner/Staff App Features (Same app, role-based UI)
- [ ] **Dashboard** - Today's bookings, queue
- [ ] **Verify Service Code** - Scan/enter 4-digit code to start service
- [ ] **Complete Service** - Mark complete, give customer feedback
- [ ] **Customer Rating** - Rate customer (like Uber driver rates passenger)
- [ ] **Cancellation Requests** - Approve/reject late cancellations

---

## API Integration

### Base Configuration
```typescript
// services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.overline.in',
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Key Endpoints
```typescript
// Auth
POST /api/otp/send          // Send OTP to phone
POST /api/otp/verify        // Verify OTP
POST /api/auth/login        // Login with email/password
POST /api/auth/refresh      // Refresh token

// Shops
GET /api/shops              // List shops (with filters)
GET /api/shops/:id          // Shop details
GET /api/shops/:id/services // Shop services
GET /api/shops/:id/slots    // Available time slots

// Bookings
POST /api/bookings          // Create booking
GET /api/bookings/my        // User's bookings
GET /api/bookings/:id       // Booking details
PATCH /api/bookings/:id/cancel-with-reason // Cancel
POST /api/bookings/:id/verify-code  // Staff verifies code

// Wallet
GET /api/wallet/balance     // Get wallet balance
GET /api/wallet/transactions // Transaction history

// Reviews
POST /api/reviews           // Create review
POST /api/reviews/user-feedback // Staff rates customer
```

---

## Development Steps

### Phase 1: Setup & Authentication (Week 1-2)
```bash
# Create new Expo app
npx create-expo-app@latest apps/mobile --template expo-template-blank-typescript

# Install dependencies
cd apps/mobile
npx expo install expo-router expo-secure-store @react-navigation/native
npm install zustand axios react-query nativewind
npm install -D tailwindcss

# Setup file-based routing
npx expo customize
```

1. Configure TailwindCSS with NativeWind
2. Setup API client with interceptors
3. Implement OTP login flow
4. Store tokens securely with expo-secure-store

### Phase 2: Core User Features (Week 3-4)
1. Home screen with shop cards
2. Shop details page
3. Booking flow with payment type selection
4. 4-digit verification code display
5. Wallet screen with balance and history

### Phase 3: Booking Management (Week 5-6)
1. My Bookings list with filters
2. Booking details with status
3. Cancellation flow with reason selection
4. Reschedule request

### Phase 4: Push Notifications (Week 7)
```bash
npx expo install expo-notifications expo-device
```

1. Configure Firebase Cloud Messaging
2. Register device token with backend
3. Handle notification actions

### Phase 5: Staff Features (Week 8)
1. Staff dashboard view
2. Verify code entry/scan
3. Complete service flow
4. Customer feedback form

### Phase 6: Polish & Testing (Week 9-10)
1. Error handling & loading states
2. Offline support with caching
3. App icons & splash screen
4. Testing on real devices

---

## UI/UX Guidelines

### Color Scheme (Match web)
```typescript
const colors = {
  primary: '#4F46E5',     // Indigo
  secondary: '#10B981',   // Emerald
  background: '#F9FAFB',  // Gray-50
  surface: '#FFFFFF',
  text: '#111827',        // Gray-900
  textMuted: '#6B7280',   // Gray-500
  error: '#EF4444',       // Red
  success: '#10B981',     // Green
};
```

### Key Screens Mockup

#### 1. Booking Confirmation (with 4-digit code)
```
┌─────────────────────────┐
│  ✓ Booking Confirmed    │
├─────────────────────────┤
│                         │
│  Your Service Code      │
│  ┌───┬───┬───┬───┐     │
│  │ 4 │ 7 │ 2 │ 8 │     │
│  └───┴───┴───┴───┘     │
│                         │
│  Show this code to      │
│  staff to start service │
│                         │
├─────────────────────────┤
│  StyleCuts Salon        │
│  Haircut + Beard        │
│  Today, 3:00 PM         │
├─────────────────────────┤
│  Payment: Pay at Shop   │
│  Amount: ₹499           │
│  Free Cash: ₹27         │
└─────────────────────────┘
```

#### 2. Wallet Screen
```
┌─────────────────────────┐
│  My Wallet              │
├─────────────────────────┤
│                         │
│  Free Cash Balance      │
│  ₹ 127.00               │
│  ↑ +27 earned today     │
│                         │
├─────────────────────────┤
│  Recent Transactions    │
│                         │
│  + ₹27 Free Cash        │
│    Service completed    │
│    Today, 4:30 PM       │
│                         │
│  - ₹25 Used             │
│    Booking #OL-XYZ123   │
│    Yesterday            │
│                         │
└─────────────────────────┘
```

#### 3. Cancel Booking (with reason)
```
┌─────────────────────────┐
│  Cancel Booking         │
├─────────────────────────┤
│                         │
│  Select a reason:       │
│                         │
│  ○ Shop was closed      │
│  ○ Personal emergency   │
│  ○ Booked by mistake    │
│  ○ Price was different  │
│  ○ Schedule conflict    │
│  ○ Found better option  │
│  ○ Other                │
│                         │
│  ┌───────────────────┐  │
│  │ Additional details│  │
│  │ (optional)        │  │
│  └───────────────────┘  │
│                         │
│  ⚠️ Cancelling within   │
│  1hr may affect refund  │
│                         │
│  [Cancel Booking]       │
└─────────────────────────┘
```

---

## Environment Setup

### Required Environment Variables
```env
# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://api.overline.in
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
```

### Backend Requirements
- Push notification service (Firebase Admin SDK)
- SMS gateway for OTP (MSG91, Twilio)
- All API endpoints tested and documented

---

## Build & Deployment

### Development
```bash
# Start development server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on iOS simulator (macOS only)
npx expo run:ios
```

### Production Build
```bash
# Build Android APK
eas build --platform android --profile production

# Build iOS IPA
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1-2 | Setup | Project scaffold, OTP auth |
| 3-4 | Core | Home, shops, booking flow |
| 5-6 | Booking | My bookings, cancel, wallet |
| 7 | Notifications | Push notifications |
| 8 | Staff | Dashboard, verify code |
| 9-10 | Polish | Testing, release |

---

## Next Steps

1. **Create mobile app folder** in monorepo: `apps/mobile/`
2. **Setup Expo** with TypeScript template
3. **Configure environment** variables and API client
4. **Start with OTP login** flow first
5. **Iterate** based on user feedback

Ready to start? Run:
```bash
cd /Users/manrajgupta/Overline
npx create-expo-app@latest apps/mobile --template expo-template-blank-typescript
```
