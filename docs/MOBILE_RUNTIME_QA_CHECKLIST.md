# Mobile Runtime QA Checklist

Date: __________
Tester: __________
Device(s): __________
Build type: Debug / Release
Backend target: Local / Staging / Production

## 1. Precheck (must pass before runtime testing)

Run:

```bash
bash scripts/mobile-runtime-precheck.sh
```

Expected:
- Backend build succeeds
- Lint checks pass for user and admin runtime flow files

## 2. Environment Boot

1. Start backend

```bash
cd apps/backend
pnpm run dev
```

2. Start user app metro

```bash
cd apps/mobile-user
pnpm start
```

3. Start admin app metro

```bash
cd apps/mobile-admin
pnpm start
```

4. Android only: reverse ports on connected device/emulator

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001
```

## 3. User App Runtime Smoke

### 3.1 Auth and Session

- [ ] Launch app and verify splash/onboarding flow renders
- [ ] Login with OTP flow succeeds
- [ ] Logout and relogin works without stale state

### 3.2 Google Login

- [ ] Tap Google login
- [ ] Google account picker opens
- [ ] Successful login lands in authenticated home
- [ ] Backend session/token is valid after app restart

### 3.3 Home and Shop Discovery

- [ ] Home list loads shops without crash
- [ ] Category filtering changes visible shop list correctly
- [ ] Opening a shop detail screen works and service data appears

### 3.4 Booking Flow (including payment step)

- [ ] Booking stepper works end-to-end (service, slot, payment)
- [ ] Pay at Shop method creates booking and confirmation screen
- [ ] Wallet method creates booking and confirmation screen
- [ ] Online method opens Razorpay checkout

### 3.5 Razorpay Verification

- [ ] Razorpay success callback returns to app
- [ ] Backend verify API confirms signature
- [ ] Booking status and payment status update correctly
- [ ] Failure/cancel path shows friendly error and does not crash

### 3.6 Profile and Edit Profile

- [ ] Profile screen opens without layout issues
- [ ] Edit Profile opens from Profile
- [ ] Name/phone save succeeds and data refreshes in Profile
- [ ] Invalid save path shows proper error message

### 3.7 Chat Tab

- [ ] Chat tab opens
- [ ] Quick prompt sends and receives assistant response
- [ ] Manual message send works
- [ ] API/network failure shows fallback assistant message

## 4. Admin App Runtime Smoke

### 4.1 Auth and Role Access

- [ ] Admin OTP login succeeds
- [ ] Shop selection works for multi-shop users
- [ ] Tab navigation (Dashboard, Queue, Bookings, Analytics, Profile) works

### 4.2 Queue and Bookings

- [ ] Queue list loads active bookings
- [ ] Call Next moves booking to IN_PROGRESS
- [ ] Mark Done moves booking to COMPLETED
- [ ] Bookings list and detail screens reflect status transitions

### 4.3 Verification Code Flow

- [ ] Verify code screen accepts 4-digit code
- [ ] Valid code resolves active booking details
- [ ] Start Service action updates status and navigates correctly
- [ ] Invalid code path shows error and resets input cleanly

### 4.4 Payout Details (Owner)

- [ ] Payout Details screen opens from Profile/Settings
- [ ] Existing payout details load
- [ ] Save with UPI only works
- [ ] Save with bank account + IFSC works
- [ ] Save with neither UPI nor valid bank details is blocked with validation message

### 4.5 Icon/Visual Regression Pass

- [ ] No emoji-based UI icons remain in runtime flows
- [ ] New lucide icons render correctly on both iOS and Android
- [ ] No clipping/misalignment in tab bar and list cards

## 5. Backend/API Runtime Validation

### 5.1 Admin payout endpoints

- [ ] GET /admin/shops/:shopId/payout-details returns current payload
- [ ] PATCH /admin/shops/:shopId/payout-details updates and persists payload
- [ ] Response includes updatedAt and merged payout fields

### 5.2 Booking payment endpoints

- [ ] Create order endpoint returns provider order data
- [ ] Verify payment endpoint accepts callback payload and validates signature
- [ ] Failure responses are stable and user-friendly

## 6. Recommended Dummy Test Data Set

Use at least:
- 1 tenant with 2 shops
- 1 owner, 1 staff, 2 users
- 4 bookings in mixed states: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED
- 2 services with different prices/durations
- 1 booking for Razorpay success path
- 1 booking for Razorpay failure/cancel path

## 7. Result Summary

Overall status: PASS / FAIL

Blocking issues:
1. ______________________________
2. ______________________________
3. ______________________________

Non-blocking issues:
1. ______________________________
2. ______________________________
3. ______________________________

## 8. Fix + Retest Log

| Issue ID | Area | Fix Commit/Ref | Retest Result |
|---------|------|----------------|---------------|
|         |      |                |               |
|         |      |                |               |
|         |      |                |               |

## 9. Release Gate Recommendation

- [ ] Ready to release
- [ ] Needs fixes before release
- [ ] Needs payment/auth hardening before release

Final notes:
________________________________________
________________________________________
