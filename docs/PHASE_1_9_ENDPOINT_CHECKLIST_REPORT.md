# Phase 1-9 Endpoint Checklist Execution Report

Date: 2026-04-03
Scope: backend endpoint verification for OWNER, STAFF, QUEUE, PAYMENTS route groups.

## Executed Evidence

1. Unit verification command:
- `pnpm -C apps/backend test -- owner.controller.spec.ts staff.controller.spec.ts payments.service.spec.ts queue.service.spec.ts bookings.service.spec.ts`
- Result: 5/5 suites passed, 43/43 tests passed.

2. E2E verification command:
- `pnpm -C apps/backend test:e2e -- queue-lifecycle.e2e-spec.ts queue-http.e2e-spec.ts`
- Result: 2/2 suites passed, 8/8 tests passed.

3. Build verification:
- `pnpm -C apps/backend build`
- Result: pass.

## OWNER Endpoints

Controller: [apps/backend/src/modules/admin/owner.controller.ts](apps/backend/src/modules/admin/owner.controller.ts)
Evidence tests: [apps/backend/src/modules/admin/owner.controller.spec.ts](apps/backend/src/modules/admin/owner.controller.spec.ts)

- `POST /owner/staff` -> PASS (unit)
- `GET /owner/staff` -> PASS (unit + missing shopId negative)
- `GET /owner/staff/:id` -> PARTIAL (implemented, no dedicated endpoint test)
- `PATCH /owner/staff/:id/suspend` -> PASS (unit)
- `POST /owner/staff/:id/restore` -> PASS (unit)
- `GET /owner/earnings` -> PARTIAL (implemented, indirect coverage only)
- `GET /owner/earnings/by-staff` -> PASS (unit)
- `GET /owner/bookings` -> PASS (unit)
- `GET /owner/queue/live` -> PARTIAL (implemented, covered indirectly by queue service tests)
- `POST /owner/queue/:bookingId/approve` -> PASS (unit)
- `POST /owner/queue/call-ahead` -> PASS (unit)
- `PATCH /owner/queue/overrun` -> PASS (unit)
- `GET /owner/reviews` -> PARTIAL (implemented, no dedicated endpoint test)
- `GET /owner/analytics/revenue` -> PARTIAL (implemented, no dedicated endpoint test)
- `PATCH /owner/settings/shop` -> PASS (unit)
- `PATCH /owner/settings/queue` -> PARTIAL (implemented, no dedicated endpoint test)
- `POST /owner/settings/photos` -> PARTIAL (implemented, no dedicated endpoint test)
- `DELETE /owner/settings/photos/:id` -> PARTIAL (implemented, no dedicated endpoint test)

## STAFF Endpoints

Controller: [apps/backend/src/modules/admin/staff.controller.ts](apps/backend/src/modules/admin/staff.controller.ts)
Evidence tests: [apps/backend/src/modules/admin/staff.controller.spec.ts](apps/backend/src/modules/admin/staff.controller.spec.ts)

- `GET /staff/me` -> PASS (route metadata + behavior)
- `PATCH /staff/me` -> PARTIAL (implemented, no dedicated endpoint test)
- `GET /staff/me/schedule` -> PARTIAL (implemented, no dedicated endpoint test)
- `PUT /staff/me/schedule` -> PASS (unit + empty-days negative)
- `GET /staff/me/services` -> PARTIAL (implemented, no dedicated endpoint test)
- `POST /staff/me/services` -> PARTIAL (implemented, no dedicated endpoint test)
- `PATCH /staff/me/services/:id` -> PARTIAL (implemented, no dedicated endpoint test)
- `POST /staff/me/services/:id/photos` -> PARTIAL (implemented, no dedicated endpoint test)
- `POST /staff/me/services/:id/videos` -> PARTIAL (implemented, no dedicated endpoint test)
- `GET /staff/me/bookings` -> PARTIAL (implemented, no dedicated endpoint test)
- `GET /staff/me/bookings/pending` -> PASS (unit)
- `PATCH /staff/me/bookings/:id/approve` -> PASS (unit)
- `PATCH /staff/me/bookings/:id/reject` -> PASS (unit)
- `PATCH /staff/me/bookings/:id/complete` -> PASS (unit)
- `PATCH /staff/me/bookings/:id/cash` -> PASS (unit + forbidden negative)
- `POST /staff/me/queue/call-ahead` -> PASS (unit)
- `PATCH /staff/me/queue/overrun` -> PASS (unit)
- `GET /staff/me/queue/locations` -> PARTIAL (implemented, no dedicated endpoint test)
- `GET /staff/me/earnings` -> PARTIAL (implemented, indirect coverage)
- `GET /staff/me/reviews` -> PARTIAL (implemented, no dedicated endpoint test)
- `PATCH /staff/me/reviews/:id/reply` -> PASS (unit + profile-missing negative)
- `POST /staff/me/payment/upi` -> PASS (unit; onboarding + verification delegation)
- `POST /staff/me/payment/verify-upi` -> PASS (unit)
- `GET /staff/me/payment` -> PASS (unit)
- `GET /staff/me/payment/payout-history` -> PASS (unit)

## QUEUE Endpoints

Controller: [apps/backend/src/modules/queue/queue.controller.ts](apps/backend/src/modules/queue/queue.controller.ts)
Evidence tests:
- [apps/backend/test/queue-http.e2e-spec.ts](apps/backend/test/queue-http.e2e-spec.ts)
- [apps/backend/test/queue-lifecycle.e2e-spec.ts](apps/backend/test/queue-lifecycle.e2e-spec.ts)
- [apps/backend/src/modules/queue/queue.service.spec.ts](apps/backend/src/modules/queue/queue.service.spec.ts)

- `GET /queue/slots` -> PASS (service + controller behavior covered)
- `GET /queue/slots/:shopId` -> PASS (e2e)
- `GET /queue/next-slot/:shopId` -> PASS (e2e)
- `GET /queue/position/:bookingId` -> PASS (e2e)
- `POST /queue/join` -> PASS (e2e)
- `POST /queue/:shopId/call-next` -> PASS (e2e)
- `POST /queue/:shopId/call-ahead` -> PASS (e2e)
- `POST /queue/:shopId/skip` -> PASS (e2e)
- `POST /queue/:shopId/overrun` -> PASS (e2e + queue algorithm unit)
- `PATCH /queue/:bookingId/check-in` -> PASS (e2e)
- `POST /queue/:bookingId/start-service` -> PASS (e2e + fraud token mismatch coverage)
- `POST /queue/:bookingId/mark-done` -> PASS (e2e)
- `DELETE /queue/:bookingId` -> PASS (e2e)

Shared queue-adjacent endpoints:
- `POST /bookings/:id/call-ahead-reply` -> PASS (bookings service unit)
- `POST /bookings/:id/share-location` -> PASS (bookings service unit)
- `GET /chat/:sessionId/messages` -> PARTIAL (implemented; no dedicated e2e)
- `POST /chat/:sessionId/messages` -> PARTIAL (implemented; no dedicated e2e)

## PAYMENTS Endpoints

Controller: [apps/backend/src/modules/payments/payments.controller.ts](apps/backend/src/modules/payments/payments.controller.ts)
Evidence tests: [apps/backend/src/modules/payments/payments.service.spec.ts](apps/backend/src/modules/payments/payments.service.spec.ts)

- `POST /payments/create-order` -> PASS (service unit for creation guards/paths)
- `POST /payments/create-intent` -> PASS (legacy alias path validated through service behavior)
- `POST /payments/verify` -> PASS (service unit; signature + earning snapshot/fallback logic)
- `GET /payments/:id` -> PARTIAL (implemented, no dedicated endpoint test)
- `POST /payments/webhook` -> PARTIAL (implemented, no dedicated endpoint test)
- `POST /payments/:id/refund` -> PARTIAL (implemented, no dedicated endpoint test)

## Bug Fixes Applied In This Sweep

1. Fixed admin-web hook dependency bug/warning in:
- [apps/admin-web/src/components/dashboard/LiveTracking.tsx](apps/admin-web/src/components/dashboard/LiveTracking.tsx)

Result:
- admin-web production build is clean.

## Remaining Strictness Gaps (non-blocking for current green gates)

1. Add endpoint-level e2e for OWNER and STAFF route groups (currently primarily unit/controller-level).
2. Add dedicated e2e for PAYMENTS controller paths (`GET /payments/:id`, webhook, refund).
3. Add dedicated e2e for chat session message endpoints.

## Current Gate State

- Backend TypeScript: PASS
- Admin-web TypeScript: PASS
- User-web TypeScript: PASS
- Mobile-admin TypeScript: PASS
- Mobile-user TypeScript: PASS
- Backend build: PASS
- Admin-web build: PASS
- User-web build: PASS
- Targeted backend unit tests: PASS
- Queue lifecycle/http e2e: PASS
