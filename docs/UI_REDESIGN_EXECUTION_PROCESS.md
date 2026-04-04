# UI Redesign Execution Process

## Goal
Deliver a UI across user web, admin web, mobile user, and mobile admin that matches the new design direction with consistent spacing, typography, component behavior, and interaction patterns.

## 1. Design Ingestion
1. Export each key frame from your design as PNG (2x) and one PDF per flow.
2. Group frames by surface:
- User Web
- Admin Web
- Mobile User
- Mobile Admin
3. Build a frame-to-route mapping table before coding.

## 2. Token First Strategy
1. Define global tokens for each platform:
- Color roles: background, surface, text, muted, brand, states
- Typography roles: display, heading, body, caption
- Spacing and radius scale
- Shadows and motion timings
2. Apply tokens in shell files first, then page files.

## 3. Shared Component Refactor
1. Standardize base components before page rebuild:
- Button, Input, Card, Badge, Tabs, Modal, EmptyState, Skeleton
2. Add component variants that match design states:
- Primary, secondary, ghost, critical
- Compact and spacious density

## 4. Page/Screen Implementation Order
1. User Web first:
- Home, Explore, Shop Detail, Booking flow, Booking detail/history, Profile, Wallet, Auth
2. Admin Web second:
- Owner dashboard, Queue, Bookings, Services, Staff, Analytics, Earnings, Payments, Settings
- Staff dashboard, Queue, Bookings, Services, Schedule, Profile, Reviews, Notifications, Earnings, Payments
3. Mobile User third:
- Home, Shop detail, Booking flow, Confirmation/detail, My bookings, Profile, Wallet, Chat, Auth
4. Mobile Admin fourth:
- Owner dashboard, Live queue, All bookings, Earnings/analytics, Settings stack
- Staff my day, my queue, services, schedule, earnings, reviews, profile, notifications, map/chat

## 5. Backend Contract Alignment
1. Keep existing endpoint behavior as default.
2. Additive response fields only for new UI requirements:
- Dashboard cards and trend chips
- Queue ETA metadata
- Booking status display metadata
- Analytics breakdown for redesigned charts
3. Avoid breaking old consumers during migration.

## 6. Quality Gates Per Slice
1. Typecheck affected app.
2. Build affected app.
3. Validate responsive behavior:
- Web: 360px, 768px, 1024px, 1440px
- Mobile: small and large device profiles
4. Compare against frame references:
- Structure
- Typography scale
- Spacing rhythm
- Interaction states

## 7. Rollout Pattern
1. Merge in small slices:
- Foundation tokens
- Shared components
- High-impact pages
- Remaining pages
2. Keep each slice releasable.
3. Run regression tests after each slice.

## Current Progress
1. Foundation tokens and typography updates started for user web and admin web.
2. User web Home and Explore are in redesign progress.
3. Mobile user Home and mobile admin Owner dashboard are now aligned to the same visual direction baseline.