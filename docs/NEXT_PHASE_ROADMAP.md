# Overline Next-Phase Roadmap

This roadmap captures high-value items suggested for the next milestones.
It is organized by implementation order, effort, and dependency risk.

## Phase 1: High Value, Low-to-Medium Effort

### 1) Staff-level availability (major conversion feature)
Goal: allow clients to pick a specific staff member and only see valid slots.

Backend changes:
- Add staff schedule model if not present:
  - `staff_working_hours` (staffId, dayOfWeek, openTime, closeTime, isClosed)
  - `staff_time_off` (staffId, startAt, endAt, reason)
- Extend slot generation API:
  - `GET /shops/:shopId/slots?serviceId=...&date=...&staffId=...`
  - If `staffId` is provided, slots are generated from staff calendar, not shop calendar.
- Booking validation:
  - Ensure service is assigned to selected staff.
  - Ensure slot is free for that staff.

Frontend changes:
- User web booking flow:
  - Step 1: service
  - Step 2: staff (Any Staff or specific person)
  - Step 3: slots generated for chosen staff
- Admin web staff module:
  - Add staff working hours editor.
  - Add leave/time-off entries.

Acceptance criteria:
- Staff-specific slots differ from general shop slots.
- Double booking same staff/time is blocked.
- Staff leave blocks their slots immediately.

## Phase 2: OTP Upgrade for India

### 2) WhatsApp OTP (Meta) with SMS fallback
Goal: reduce OTP cost and improve delivery success in India.

Design:
- Introduce channel abstraction in auth service:
  - `OtpChannelProvider.send(phone, code, channel)`
  - Supported channels: `WHATSAPP`, `SMS`
- Preference policy:
  - Try WhatsApp first when enabled.
  - Fallback to SMS (Twilio) if WhatsApp send fails.
- Keep existing Redis key and rate-limit logic.

Backend additions:
- New env vars:
  - `META_WABA_PHONE_NUMBER_ID`
  - `META_WABA_ACCESS_TOKEN`
  - `META_WABA_VERSION` (e.g. v20.0)
- API extension:
  - `POST /auth/send-otp` accepts optional `{ channel }`.

Frontend:
- Add hint text on OTP screen: "We sent your OTP via WhatsApp" or "via SMS".

Acceptance criteria:
- OTP can be delivered through WhatsApp.
- SMS fallback works automatically.
- Existing verify endpoint unchanged.

## Phase 3: Architecture Safety Before Scale

### 3) Multi-location support (owner with many branches)
Goal: support one owner operating multiple locations cleanly.

Recommended schema direction:
- Current: tenant -> shop
- Proposed: tenant -> brand -> location (or tenant -> location if simpler)

Minimal migration path:
- Add `location` table with all address/timezone/geocoordinates.
- Keep `shop` as business profile template or merge into `location` over time.
- Move operational entities (`bookings`, `queue`, `staff_assignment`) to reference `locationId`.

API strategy:
- Keep old endpoints temporarily and map shopId to default location.
- Introduce new endpoints incrementally:
  - `GET /locations`
  - `GET /locations/:id/services`
  - `GET /locations/:id/slots`

Acceptance criteria:
- Owner can manage two branches under one login.
- Dashboard can switch location scope.
- Booking and queue are location-specific.

## Phase 4: Trust and Authenticity

### 4) Verified reviews only from completed bookings
Goal: prevent fake reviews and increase platform trust.

Backend rules:
- Review creation requires:
  - booking exists
  - booking belongs to user
  - booking status = COMPLETED
  - one review per booking
- Review model fields:
  - `bookingId`, `shopId/locationId`, `userId`, `rating`, `comment`, `createdAt`

API:
- `POST /reviews` with `bookingId`.
- Reject if user not eligible.
- Aggregate rating recalculation async (queue job) or transactional update.

Frontend:
- Prompt review only after completion.
- Show "Verified visit" badge.

Acceptance criteria:
- Cannot review without completed booking.
- Public reviews are all verified.

## Phase 5: React Native Productization

### 5) Build RN app to parity with core web flows
Goal: ship mobile client quickly using existing API-first backend.

Execution order:
1. Auth (email/google/otp)
2. Shop discovery + geolocation
3. Slot booking + queue tracker
4. Wallet + notifications

Engineering guardrails:
- Shared DTO contract from backend OpenAPI.
- Keep business rules in backend only.
- Socket event parity with web.

Release readiness:
- Add crash reporting (Sentry/Firebase Crashlytics).
- Add feature flags for gradual rollout.
- Add smoke E2E for auth + booking + queue.

---

## Suggested Delivery Sequence (practical)

1. Staff-level availability
2. WhatsApp OTP with SMS fallback
3. Verified reviews
4. Multi-location data model + migration
5. RN app feature parity and release hardening

## Engineering Notes

- Preserve backward compatibility for old APIs during migration windows.
- Add migration scripts and data backfills before enabling new flows.
- Add observability counters for OTP delivery, slot fill rate, no-show rate, and queue latency.
