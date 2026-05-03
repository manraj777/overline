import type { GetServerSideProps } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://overline.in').replace(/\/$/, '');
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '') ||
  'https://api.overline.in'
).replace(/\/$/, '');

type Freq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: Freq;
  priority?: number;
}

/**
 * Filter out test / incomplete shops from public listings.
 * Keeps the sitemap clean and prevents Google from indexing placeholder pages.
 */
function isShopPubliclyListable(shop: {
  name?: string;
  slug?: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
}): boolean {
  if (shop.isActive === false) return false;
  if (!shop.name || shop.name.trim().length < 3) return false;
  if (!shop.slug) return false;
  if (!shop.address || !shop.city) return false;
  if (!shop.phone || shop.phone.replace(/\D/g, '').length < 10) return false;
  return true;
}

const STATIC_ROUTES: UrlEntry[] = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/explore', changefreq: 'hourly', priority: 0.9 },
  { loc: '/blog', changefreq: 'weekly', priority: 0.6 },
  { loc: '/privacy', changefreq: 'monthly', priority: 0.3 },
  { loc: '/terms', changefreq: 'monthly', priority: 0.3 },
  { loc: '/auth/signup', changefreq: 'monthly', priority: 0.4 },
  { loc: '/auth/login', changefreq: 'monthly', priority: 0.4 },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toUrlXml(entry: UrlEntry): string {
  const loc = xmlEscape(`${SITE_URL}${entry.loc}`);
  const parts = [`<loc>${loc}</loc>`];
  if (entry.lastmod) parts.push(`<lastmod>${entry.lastmod}</lastmod>`);
  if (entry.changefreq) parts.push(`<changefreq>${entry.changefreq}</changefreq>`);
  if (entry.priority != null) parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
  return `<url>${parts.join('')}</url>`;
}

async function fetchShops(): Promise<UrlEntry[]> {
  try {
    // Paginate through up to a few thousand shops — good enough for v1.
    const entries: UrlEntry[] = [];
    let page = 1;
    const limit = 100;
    const maxPages = 50;
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);

    while (page <= maxPages) {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/shops?page=${page}&limit=${limit}`,
        { signal: ac.signal, headers: { accept: 'application/json' } },
      );
      if (!res.ok) break;
      const body = (await res.json()) as {
        data?: Array<{
          slug?: string;
          id: string;
          name?: string;
          address?: string;
          city?: string;
          phone?: string;
          isActive?: boolean;
          updatedAt?: string;
        }>;
        total?: number;
      };
      const rows = body?.data || [];
      if (!rows.length) break;
      for (const s of rows) {
        const slug = s.slug || s.id;
        if (!slug) continue;
        // Filter out test / incomplete shops
        if (!isShopPubliclyListable(s)) continue;
        entries.push({
          loc: `/shops/${slug}`,
          lastmod: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
          changefreq: 'daily',
          priority: 0.8,
        });
      }
      if (rows.length < limit) break;
      page += 1;
    }
    clearTimeout(timeout);
    return entries;
  } catch {
    return [];
  }
}

function Sitemap() {
  // getServerSideProps writes the body directly; this component never renders.
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const shopEntries = await fetchShops();
  const now = new Date().toISOString();

  const allEntries: UrlEntry[] = [
    ...STATIC_ROUTES.map((r) => ({ lastmod: now, ...r })),
    ...shopEntries,
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(toUrlXml).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Cache for 1h at the CDN, 10m in the browser
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  res.write(body);
  res.end();

  return { props: {} };
};

export default Sitemap;
