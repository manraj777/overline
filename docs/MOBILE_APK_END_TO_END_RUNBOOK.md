# Mobile APK End-to-End Demo Runbook

This runbook builds and validates both APKs for the required flow:
- Google login
- Mandatory Razorpay online payment
- Booking confirmation with unique verification code
- Admin service lifecycle completion (IN_PROGRESS -> COMPLETED)

## 1. Required Inputs

1. `apps/mobile-user/android/app/google-services.json`
2. Backend env keys in `apps/backend/.env`:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
3. Android device connected with USB debugging (or emulator)

## 2. One-time Preflight

```bash
bash scripts/mobile-demo-preflight.sh
bash scripts/mobile-runtime-precheck.sh
```

## 3. Start Local Services

Terminal 1:
```bash
cd apps/backend
pnpm run dev
```

Terminal 2:
```bash
cd apps/mobile-user
pnpm start
```

Terminal 3:
```bash
cd apps/mobile-admin
pnpm start
```

Terminal 4 (Android networking):
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001
```

## 4. Seed Dummy Data

```bash
cd apps/backend
pnpm run prisma:seed
```

Expected demo credentials from seed output:
- `admin@overline.in / admin123`
- `owner@stylecuts.in / admin123`
- `user@demo.com / admin123`

## 5. Build APKs

Debug APKs (recommended first):
```bash
cd /Users/manrajgupta/Overline
bash build-apks.sh debug
```

Release APKs (requires signing setup):
```bash
cd /Users/manrajgupta/Overline
bash build-apks.sh release
```

APK paths:
- User: `apps/mobile-user/android/app/build/outputs/apk/<mode>/app-<mode>.apk`
- Admin: `apps/mobile-admin/android/app/build/outputs/apk/<mode>/app-<mode>.apk`

## 6. Install APKs

```bash
adb install -r apps/mobile-user/android/app/build/outputs/apk/debug/app-debug.apk
adb install -r apps/mobile-admin/android/app/build/outputs/apk/debug/app-debug.apk
```

## 7. Execute Mandatory Demo Flow

### User app
1. Login with Google
2. Choose shop and service
3. Pick slot
4. Continue to payment (online-only)
5. Complete Razorpay checkout
6. Reach booking confirmation and capture unique verification code

### Admin app
1. Login as owner/admin
2. Open queue/verify code flow
3. Enter verification code from user booking
4. Start service -> status IN_PROGRESS
5. Mark done -> status COMPLETED

## 8. Validate & Report

Use:
- `docs/MOBILE_RUNTIME_QA_CHECKLIST.md`
- `docs/MOBILE_RUNTIME_QA_REPORT_TEMPLATE.md`

Must pass items:
- Google login works on device
- Razorpay payment verified by backend
- Booking confirmation shows verification code
- Admin completes service successfully
