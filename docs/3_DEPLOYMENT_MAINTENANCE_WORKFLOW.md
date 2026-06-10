# 🚀 Overline: Deployment & Maintenance Workflow

> [!CAUTION]
> This document guides the process of deploying the Overline apps, monitoring performance, and dealing with fraud/security issues. Always ensure environments are correctly set before pushing to production.

## 1. Web & API Deployment
- **Backend**: Hosted on cloud providers (e.g., Vercel, Railway, Render). Ensure `DATABASE_URL` is pointing to the production pooler. 
- **Web App**: Hosted via Next.js serverless functions.
- **Database**: Prisma handles schema migrations. Do **NOT** run `prisma push` in production. Always use `prisma migrate deploy`.

## 2. Mobile App Deployment (React Native / Expo)
1. Ensure `app.json` has the correct `bundleIdentifier` (iOS) and `package` (Android).
2. Generate APK: `bash build-apks.sh release`.
3. Over-the-air (OTA) updates can be pushed via EAS if configured.
4. **Push Notifications**: Managed via Firebase Cloud Messaging (FCM). 
   - Admin alert audio configuration uses `react-native-sound`.
   - Test push notifications locally using an Android Emulator with Google Play Services enabled.

## 3. Fraud Detection & Maintenance
- **High-Risk Activities**: Look out for rapid successive bookings from the same IP or device identifier.
- **Superadmin Action**: Use the Platform Dashboard (`/admin/platform/dashboard`) to **Suspend Shops** or **Ban Users** if malicious activity is detected.
- **Payment Audits**: Ensure Razorpay/Stripe webhooks are strictly validated against their signing secrets in the NestJS backend to prevent spoofed successful payment events.

## 4. Environment Variables Checklist
Before deployment, verify these exist securely (do not write them to disk in plaintext):
- `JWT_SECRET` (Strong alphanumeric)
- `DATABASE_URL`
- `FIREBASE_SERVER_KEY`
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
