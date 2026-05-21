import React from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MapPin, ArrowLeft, Search } from 'lucide-react';
import { ShopCard } from '@/components/shop';
import { SeoHead, jsonLd } from '@/components/seo/SeoHead';
import { useShops } from '@/hooks';

const TYPE_META: Record<string, { label: string; plural: string; backendType: string }> = {
  salon: { label: 'Salon', plural: 'Salons', backendType: 'SALON' },
  spa: { label: 'Spa', plural: 'Spas', backendType: 'SPA' },
  clinic: { label: 'Clinic', plural: 'Clinics', backendType: 'CLINIC' },
  barber: { label: 'Barbershop', plural: 'Barbershops', backendType: 'BARBER' },
  gym: { label: 'Gym', plural: 'Gyms', backendType: 'GYM' },
};

interface Props {
  type: string;
  city: string;
  displayCity: string;
}

export default function CityTypePage({ type, city, displayCity }: Props) {
  const router = useRouter();
  const meta = TYPE_META[type] || { label: type, plural: type, backendType: type.toUpperCase() };

  const { data: shops, isLoading } = useShops({
    type: meta.backendType as any,
    city: displayCity,
    limit: 50,
  });

  const shopList = shops?.data || [];

  const title = `Best ${meta.plural} in ${displayCity} — Book Online`;
  const description = `Discover and book the best ${meta.plural.toLowerCase()} in ${displayCity}. Real-time availability, transparent pricing, live queue status. Skip the wait — book on Overline.`;

  const seoJsonLd = [
    jsonLd.breadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Explore', url: '/explore' },
      { name: meta.plural, url: `/explore?type=${meta.backendType}` },
      { name: displayCity, url: `/explore/${type}/${city}` },
    ]),
  ];

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        canonical={`/explore/${type}/${city}`}
        keywords={`${meta.label.toLowerCase()} ${displayCity}, book ${meta.label.toLowerCase()} online, best ${meta.plural.toLowerCase()} in ${displayCity}, ${displayCity} ${meta.label.toLowerCase()} appointment, Overline`}
        jsonLd={seoJsonLd}
      />

      <div className="min-h-screen bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
            <span>/</span>
            <Link href={`/explore?type=${meta.backendType}`} className="hover:text-foreground transition-colors">{meta.plural}</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">{displayCity}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-primary" />
              <span className="text-sm font-semibold text-primary">{displayCity}</span>
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Best {meta.plural} in {displayCity}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Explore verified {meta.plural.toLowerCase()} in {displayCity}. Book appointments instantly with real-time
              availability, transparent pricing, and live queue tracking.
            </p>
          </div>

          {/* Shop grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : shopList.length === 0 ? (
            <div className="text-center py-20">
              <Search size={40} className="mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-bold text-foreground mb-1">No {meta.plural.toLowerCase()} found</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;re expanding in {displayCity}. Check back soon or explore other areas.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft size={14} />
                Explore All
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted-foreground mb-4">
                {shopList.length} {shopList.length === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()} found
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopList.map((shop: any) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            </>
          )}

          {/* SEO content block */}
          <section className="mt-16 border-t border-border pt-8">
            <h2 className="text-xl font-bold text-foreground mb-3">
              Book {meta.plural} in {displayCity} Online
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Looking for the best {meta.plural.toLowerCase()} in {displayCity}? Overline makes it easy to discover
              top-rated {meta.plural.toLowerCase()}, compare services and prices, and book your appointment in
              seconds. See real-time availability, check live queue status, and pay securely online
              or at the shop. No more waiting — skip the queue with Overline.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, res }) => {
  const type = (params?.type as string) || '';
  const citySlug = (params?.city as string) || '';

  if (!TYPE_META[type]) {
    return { notFound: true };
  }

  // Convert slug back to display name (capitalize words)
  const displayCity = citySlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Cache for 1 day at CDN
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');

  return {
    props: { type, city: citySlug, displayCity },
  };
};
