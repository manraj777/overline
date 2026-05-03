# Shop SEO & Public Listing Requirements

## Overview

For a shop to appear in public search results, the sitemap, and be indexed by Google, it must meet **all** of the following minimum requirements. Shops that fail these checks are considered "test" or "incomplete" and are filtered out.

## Required Fields

| Field | Type | Requirement |
|-------|------|-------------|
| `name` | string | Non-empty, ≥ 3 characters |
| `slug` | string | Non-empty, URL-safe |
| `address` | string | Non-empty street address |
| `city` | string | Non-empty city name |
| `phone` | string | Valid Indian phone number (10+ digits) |
| `isActive` | boolean | Must be `true` |

## Recommended Fields (SEO Impact)

| Field | Impact | Notes |
|-------|--------|-------|
| `description` | High | 50–300 characters for meta description |
| `coverUrl` | High | OG image; hero image on detail page |
| `latitude` / `longitude` | High | Enables map and "near me" search |
| `workingHours[]` | High | Required for "Open Now" badge and LocalBusiness schema |
| `services[]` | High | At least 1 active service for booking CTA |
| `staff[]` | Medium | At least 1 active staff for booking flow |
| `postalCode` | Medium | Improves local SEO accuracy |
| `state` | Medium | Used in structured data |
| `email` | Low | Contact fallback |
| `logoUrl` | Low | Favicon / brand consistency |
| `photoUrls[]` | Medium | Gallery on detail page; image pack in SERP |
| `googleRating` | Medium | Star snippet in SERP |
| `googleReviewsCount` | Medium | Review count in SERP |

## `isShopPubliclyListable()` Helper

This function is used by the sitemap generator and any public listing endpoint:

```typescript
export function isShopPubliclyListable(shop: {
  name?: string;
  slug?: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
}): boolean {
  if (!shop.isActive) return false;
  if (!shop.name || shop.name.trim().length < 3) return false;
  if (!shop.slug) return false;
  if (!shop.address || !shop.city) return false;
  if (!shop.phone || shop.phone.replace(/\D/g, '').length < 10) return false;
  return true;
}
```

## Sitemap Filtering

The sitemap at `/sitemap.xml` calls `isShopPubliclyListable()` on every shop returned by the API. Shops failing the check are excluded from the XML output to prevent Google from indexing incomplete pages.

## SEO Structured Data

Each qualifying shop detail page (`/shops/[slug]`) emits:

1. **LocalBusiness** JSON-LD — with name, address, geo, hours, price range, aggregate rating
2. **BreadcrumbList** JSON-LD — Home → Explore → Shop Name

## Checklist for New Shops

Before a shop goes live, ensure:

- [ ] Business name is real (not "Test Shop" or "asdf")
- [ ] Street address is accurate and geocoded
- [ ] Phone number is reachable
- [ ] At least 1 service with price and duration
- [ ] At least 1 staff member assigned to that service
- [ ] Working hours set for all 7 days
- [ ] Cover photo uploaded (≥ 800×600px recommended)
- [ ] Shop description written (50–300 chars)
- [ ] `isActive` flag set to `true`
