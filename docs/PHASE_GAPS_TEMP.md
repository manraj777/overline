# Phase Gaps Temporary Tracker

This file tracks schema-dependent or deferred items to reconcile at end of Phase 9.

## Added During Phase 2.2 / 2.3 (April 3, 2026)

- Staff hierarchy and staff commission are currently stored under Shop.settings JSON:
  - settings.staffHierarchy
  - settings.staffCommissions
- Reason: dedicated schema fields (for manager/subordinate graph and commission records) are not finalized for this phase.

- Staff self time-off currently reuses legacy StaffTimeOff model.
- Returned status is compatibility-mapped in API responses (pending-style behavior), because explicit approval-status columns are not yet in schema.

- Staff role permissions in this phase are compatibility-based:
  - Uses UserRole.STAFF + ownership/assignment checks
  - Fine-grained staffRole enum and StaffRoles guard matrix are marked for later phase alignment.

## Do Not Change Yet

- Existing /admin/shops/:shopId/staff/* management routes remain intact for backward compatibility.
- Existing queue and slot engine behavior remains unchanged.
- Existing tenant-based access helper is preserved; owner-only routes additionally enforce ownerId checks.

## Added During Phase 3.1 Start (April 3, 2026)

- Admin-web routing has been migrated to role-first route trees with compatibility redirects:
  - OWNER primary: /owner/*
  - STAFF primary: /staff/*
  - SUPER_ADMIN primary: /platform/*

- Current owner pages are wired to existing stable page implementations for safe rollout.
- /owner/dashboard now has an owner-specific first-pass implementation with:
  - owner KPI cards,
  - staff performance table,
  - queue utilization heatmap,
  - owner financial trend + snapshot,
  - recent review feed placeholder.
- Full visual/data rebuild of all owner modules (heatmap detail panel, advanced queue controls, complete staff slide-over analytics, payout ledger enrichments) is in progress and will be completed across upcoming phase commits.

- Existing lint warning in admin-web remains pre-existing/non-blocking:
  - src/components/dashboard/LiveTracking.tsx react-hooks/exhaustive-deps warning.

## Added During Phase 4 Start (April 3, 2026)

- Staff sidebar is now separated with dedicated teal theme and grouped navigation sections:
  - My Day, My Work, My Money, Reputation, Settings.
- Staff pages now have dedicated route implementations for:
  - /staff/dashboard
  - /staff/queue
  - /staff/bookings
  - /staff/notifications
- Additional staff routes are created and wired as placeholders for next vertical slice:
  - /staff/services
  - /staff/schedule
  - /staff/earnings
  - /staff/payments
  - /staff/reviews
  - /staff/profile
- New staff hook module added for `/admin/staff/me/*` APIs; pages now consume staff-scoped endpoints instead of owner/admin-wide pages.
- Deferred for next slice:
  - Reviews analytics + reply flow,
  - Profile + payment forms with full edit actions.

## Added During Phase 4 Slice 2 (April 3, 2026)

- Staff pages implemented with full first-pass functionality:
  - /staff/services (cards, add/edit/delete modal, active toggle, media manager placeholders)
  - /staff/schedule (weekly grid, break editor UI, blocked dates add/remove, save flow)
  - /staff/earnings (date/payment filters, summary cards, stacked bars, transaction table, CSV export)

- Staff service CRUD backend role access updated in services controller to include STAFF for:
  - POST /services/shop/:shopId
  - PATCH /services/:id
  - DELETE /services/:id
  - PATCH /services/shop/:shopId/reorder

- Known intentional limitations for this phase:
  - Service media manager is placeholder-only (Cloudinary upload wiring deferred by decision).
  - Schedule break labels/ranges are currently UI-level only; backend schedule DTO does not yet persist per-day break arrays.
  - Schedule "save" uses batched PATCH /admin/staff/me/schedule/:dayOfWeek because PUT /staff/me/schedule is not available in current backend.

## Added During Phase 4 Slice 3 (April 3, 2026)

- Staff pages implemented with full first-pass functionality:
  - /staff/reviews (overview, distribution bars, filters, cards, inline reply)
  - /staff/profile (editable profile + avatar upload + notification preferences)
  - /staff/payments (UPI/bank form + payout history table)

- Staff review page currently scopes to "my reviews" by:
  - dedicated backend endpoint `GET /admin/staff/me/reviews` with server-side scoping to staff-assigned bookings.
  - supports page/limit/rating/withComment/unanswered filters and returns stats + meta for the staff reviews page.

## Added During Phase 5 Start (April 3, 2026)

- Mobile-admin now branches authenticated users into role-specific tab trees:
  - OWNER/SUPER_ADMIN tabs: Dashboard, Queue, Bookings, Earnings, Profile.
  - STAFF tabs: My Day, Queue, Earn, Profile.

- Role flags are normalized in mobile auth state for route guards:
  - `isOwner` (OWNER or SUPER_ADMIN)
  - `isStaff` (STAFF)

- Temporary compatibility mappings used in this initial slice:
  - OWNER Earnings currently reuses existing `AnalyticsTabScreen`.
  - STAFF My Day currently reuses existing `DashboardScreen`.
  - STAFF Earn currently reuses existing `AnalyticsTabScreen`.

- Settings screen now applies first-pass role guard:
  - Shop Management section is owner-only in mobile-admin.

## Added During Phase 5 Slice 2 (April 3, 2026)

- Mobile-admin now has dedicated owner tab screens wired:
  - OwnerDashboardScreen
  - LiveQueueScreen
  - AllBookingsScreen
  - OwnerEarningsScreen

- Mobile-admin now has dedicated staff core tab screens wired:
  - MyDayScreen
  - MyQueueScreen
  - MyEarningsScreen
  - MyProfileScreen

- Staff queue actions are now wired end-to-end for mobile use:
  - POST /queue/:shopId/call-ahead
  - POST /queue/:shopId/skip
  - POST /queue/:shopId/overrun

- Remaining intentional placeholder in this slice:
  - MyProfile shortcut destinations (My Services/My Schedule/My Reviews/Notification Settings/Payment UPI) currently show a "next slice" notice and will be connected to dedicated destination screens in follow-up.

## Added During Phase 5 Slice 3 (April 3, 2026)

- Staff profile shortcuts are now wired to dedicated mobile screens:
  - MyServicesScreen
  - MyScheduleScreen
  - MyReviewsScreen
  - NotificationSettingsScreen
  - PaymentUPIScreen

- Staff queue supporting mobile screens are now added and routed:
  - PendingApprovalsScreen
  - LocationMapScreen (first-pass visual map canvas)
  - PreArrivalChatScreen

- MyQueue now includes realtime update strategy:
  - websocket-first queue sync via `/queue` namespace room subscription (`queueUpdate` event)
  - automatic 10-second polling fallback when socket is disconnected.

- Remaining intentional limitations in this slice:
  - Location map uses first-pass visual canvas/dots (react-native-maps integration still pending).
  - Pre-arrival chat currently uses local in-screen state and templates; persistence/read receipts wiring is still pending.
  - MyReviewsScreen currently uses completed-bookings proxy data until dedicated mobile review endpoint contract is wired.
