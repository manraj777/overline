/**
 * Shop listability rules.
 *
 * A shop only belongs in public listings (sitemap, homepage recommendations,
 * search results used for SEO pages) if it meets a minimum quality bar.
 * This prevents test / half-built shops from leaking into Google's index
 * and harming ranking.
 *
 * Used by:
 *   - /sitemap.xml generation   (filter shops before writing URLs)
 *   - any future public shop directory / JSON-LD feed
 *
 * The **authoritative** filter still lives on the backend (shops service
 * applies `isActive: true`). This helper is the frontend belt-and-braces
 * layer for SEO surfaces.
 */

export interface ShopListabilityInput {
  slug?: string | null;
  id: string;
  name?: string | null;
  isActive?: boolean | null;
  address?: string | null;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
  images?: Array<{ url?: string | null }> | null;
  photoUrls?: string[] | null;
  servicesCount?: number | null;
  _count?: { services?: number } | null;
  workingHours?: Array<any> | null;
  updatedAt?: string | Date | null;
}

/**
 * Heuristic: slugs like "hii-6468", "qwe-3118", "zxc-3972" are disposable
 * test shops created via the admin registration flow. They have a 2–6 char
 * lowercase prefix followed by a short numeric suffix.
 */
const TEST_SLUG_PATTERNS = [
  /^[a-z]{1,6}-\d{1,6}$/,          // hii-6468, qwe-3118, abc-123
  /^owner[-_]?test/i,              // owner-test-shop-2489
  /^test[-_]/i,                    // test-shop, test_shop
  /[-_]test$/i,                    // shop-test, shop_test
  /\b(demo|dummy|temp|tmp|fake|sample|example)\b/i,
];

/**
 * Reserved slugs that should never be emitted as shop URLs even if the
 * backend happens to assign them.
 */
const RESERVED_SLUGS = new Set([
  'undefined',
  'null',
  '',
  'test',
  'demo',
  'admin',
]);

export function isLikelyTestSlug(slug: string | null | undefined): boolean {
  if (!slug) return true;
  const s = slug.trim().toLowerCase();
  if (RESERVED_SLUGS.has(s)) return true;
  return TEST_SLUG_PATTERNS.some((rx) => rx.test(s));
}

/**
 * Public-listing gate. Returns true only when the shop has enough data
 * to be a useful landing page for an SEO visitor.
 *
 * Current rules:
 *   1. `isActive` must not be explicitly false.
 *   2. Slug must be present and not match a test pattern.
 *   3. Name & address must be non-empty.
 *   4. If servicesCount is known, must be >= 1.
 */
export function isShopPubliclyListable(shop: ShopListabilityInput): boolean {
  if (shop.isActive === false) return false;

  if (isLikelyTestSlug(shop.slug)) return false;

  const name = (shop.name || '').trim();
  if (!name) return false;
  if (isLikelyTestSlug(name.toLowerCase().replace(/\s+/g, '-'))) return false;

  const address = (shop.address || '').trim();
  if (!address) return false;

  // New Requirements: Cover image
  const hasCover = shop.coverImageUrl || shop.coverUrl;
  const hasPhotos = (shop.images && shop.images.length > 0) || (shop.photoUrls && shop.photoUrls.length > 0);
  if (!hasCover && !hasPhotos) return false;

  // New Requirements: Working Hours
  if (!shop.workingHours || shop.workingHours.length === 0) return false;

  // New Requirements: Services Count
  const svcCount = shop.servicesCount ?? shop._count?.services ?? undefined;
  if (typeof svcCount === 'number' && svcCount < 1) {
    return false;
  }

  return true;
}
