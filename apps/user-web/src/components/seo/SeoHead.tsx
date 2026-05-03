import React from 'react';
import Head from 'next/head';

export interface SeoHeadProps {
  /** Page title — will be suffixed with brand unless `noSuffix` is true */
  title: string;
  description: string;
  /** Absolute canonical URL. If omitted, we build from `asPath`. */
  canonical?: string;
  /** Relative or absolute image URL (1200x630 recommended). */
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile' | 'business.business';
  /** JSON-LD objects to inject. Pass one or many. */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noindex?: boolean;
  noSuffix?: boolean;
  /** Comma-separated keywords (optional — mostly ignored by Google but helps others). */
  keywords?: string;
}

const BRAND = 'Overline';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://overline.in').replace(/\/$/, '');
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

function absUrl(input: string): string {
  if (!input) return SITE_URL;
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  return `${SITE_URL}${input.startsWith('/') ? input : `/${input}`}`;
}

export function SeoHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  jsonLd,
  noindex = false,
  noSuffix = false,
  keywords,
}: SeoHeadProps) {
  const fullTitle = noSuffix ? title : `${title} | ${BRAND}`;
  const canonicalUrl = canonical ? absUrl(canonical) : undefined;
  const image = absUrl(ogImage || DEFAULT_OG_IMAGE);

  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}

      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      )}

      {/* OpenGraph */}
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@overline_in" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldArray.map((ld, i) => (
        <script
          key={`ld-${i}`}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </Head>
  );
}

/**
 * Reusable JSON-LD factories for the most common Overline entities.
 */
export const jsonLd = {
  organization: (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: SITE_URL,
    logo: `${SITE_URL}/overline-logo.png`,
    sameAs: [
      'https://twitter.com/overline_in',
      'https://www.instagram.com/overline.in',
      'https://www.linkedin.com/company/overline',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'support@overline.in',
        contactType: 'customer support',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi'],
      },
    ],
  }),

  website: (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/explore?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }),

  breadcrumbs: (items: Array<{ name: string; url: string }>): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.url),
    })),
  }),

  localBusiness: (shop: {
    id: string;
    slug?: string;
    name: string;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    email?: string | null;
    coverImage?: string | null;
    photos?: string[] | null;
    priceRange?: string | null;
    shopType?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    workingHours?: Array<{ dayOfWeek: string; openTime?: string | null; closeTime?: string | null; isClosed?: boolean }> | null;
    services?: Array<{ id: string; name: string; price?: number | null }> | null;
  }): Record<string, unknown> => {
    const typeMap: Record<string, string> = {
      SALON: 'BeautySalon',
      SPA: 'HealthAndBeautyBusiness',
      CLINIC: 'MedicalBusiness',
      BARBER: 'HairSalon',
      GYM: 'ExerciseGym',
    };
    const schemaType = typeMap[(shop.shopType || '').toUpperCase()] || 'LocalBusiness';

    const dayMap: Record<string, string> = {
      MONDAY: 'Mo',
      TUESDAY: 'Tu',
      WEDNESDAY: 'We',
      THURSDAY: 'Th',
      FRIDAY: 'Fr',
      SATURDAY: 'Sa',
      SUNDAY: 'Su',
    };

    const openingHoursSpec = (shop.workingHours || [])
      .filter((w) => !w.isClosed && w.openTime && w.closeTime)
      .map((w) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${
          {
            MONDAY: 'Monday',
            TUESDAY: 'Tuesday',
            WEDNESDAY: 'Wednesday',
            THURSDAY: 'Thursday',
            FRIDAY: 'Friday',
            SATURDAY: 'Saturday',
            SUNDAY: 'Sunday',
          }[w.dayOfWeek.toUpperCase()] || 'Monday'
        }`,
        opens: w.openTime,
        closes: w.closeTime,
      }));

    const images: string[] = [];
    if (shop.coverImage) images.push(absUrl(shop.coverImage));
    for (const p of shop.photos || []) {
      if (p) images.push(absUrl(p));
    }

    const url = shop.slug ? `${SITE_URL}/shops/${shop.slug}` : `${SITE_URL}/shops/${shop.id}`;

    const entity: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      '@id': url,
      name: shop.name,
      url,
      description: shop.description || undefined,
      image: images.length ? images : undefined,
      telephone: shop.phone || undefined,
      email: shop.email || undefined,
      priceRange: shop.priceRange || '₹₹',
      address: shop.address
        ? {
            '@type': 'PostalAddress',
            streetAddress: shop.address,
            addressLocality: shop.city || undefined,
            addressRegion: shop.state || undefined,
            postalCode: shop.postalCode || undefined,
            addressCountry: shop.country || 'IN',
          }
        : undefined,
      geo:
        shop.latitude != null && shop.longitude != null
          ? { '@type': 'GeoCoordinates', latitude: shop.latitude, longitude: shop.longitude }
          : undefined,
      openingHoursSpecification: openingHoursSpec.length ? openingHoursSpec : undefined,
      aggregateRating:
        shop.rating && shop.reviewCount
          ? {
              '@type': 'AggregateRating',
              ratingValue: shop.rating,
              reviewCount: shop.reviewCount,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
      makesOffer: (shop.services || []).slice(0, 20).map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name },
        price: s.price ?? undefined,
        priceCurrency: 'INR',
      })),
    };

    // Strip undefined
    return JSON.parse(JSON.stringify(entity));
  },

  faqPage: (items: Array<{ question: string; answer: string }>): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  }),
};

export { SITE_URL };
