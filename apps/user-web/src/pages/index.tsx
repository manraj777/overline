import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Scissors, Stethoscope, ArrowRight,
  Dumbbell, Flower2, Calendar, Sparkles, Zap, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShopCard } from '@/components/shop';
import { useShops, useLocation, useAiRecommendations } from '@/hooks';
import { SeoHead, jsonLd } from '@/components/seo/SeoHead';

const HOME_FAQ = [
  {
    question: 'What is Overline?',
    answer:
      'Overline is a premium appointment booking platform that lets you reserve time slots at verified salons, barbershops, spas, clinics, and fitness studios \u2014 with real-time availability, live queue tracking, and pay-at-shop, wallet, or online (Razorpay) payment options.',
  },
  {
    question: 'Does Overline charge anything to book an appointment?',
    answer:
      'Browsing and booking on Overline is free for customers. A small platform convenience fee may apply when you pay online; it is always shown at checkout before you confirm.',
  },
  {
    question: 'Can I cancel or reschedule my booking?',
    answer:
      'Yes. You can cancel or reschedule any upcoming booking from the My Bookings page. Cancellation windows depend on each shop\u2019s policy and are clearly shown at checkout.',
  },
  {
    question: 'How do I skip the queue?',
    answer:
      'When you book a time slot on Overline, the shop allocates your spot in advance so you walk in and get served right on time \u2014 no waiting. For walk-in queues, our live queue tracker shows the estimated wait before you leave home.',
  },
  {
    question: 'Which cities does Overline serve?',
    answer:
      'Overline is live in select Indian cities and expanding quickly. Type your city in the Explore page to see verified shops near you.',
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [locationQuery, setLocationQuery] = React.useState('');
  const { location, loading: locationLoading, requestLocation } = useLocation(true);

  const { data: popularShops, isLoading } = useShops({
    limit: 6,
    latitude: location?.lat,
    longitude: location?.lng,
    radiusKm: 50,
  });

  const categories = [
    { name: 'Salon', icon: Scissors, href: '/explore?type=SALON' },
    { name: 'Gym', icon: Dumbbell, href: '/explore?type=GYM' },
    { name: 'Clinic', icon: Stethoscope, href: '/explore?type=CLINIC' },
    { name: 'Spa', icon: Flower2, href: '/explore?type=SPA' },
  ];

  return (
    <>
      <SeoHead
        title="Book Salons, Spas & Clinics Online — Skip the Queue"
        noSuffix={false}
        description="Overline is India’s premium booking platform for salons, barbershops, spas, clinics, and gyms. Live availability, real-time queue, Razorpay or pay-at-shop — reserve your slot in seconds."
        keywords="book salon online, barber appointment, spa booking, skip the queue, clinic appointment, salon near me, Overline, online booking India"
        canonical="/"
        ogType="website"
        jsonLd={jsonLd.faqPage(HOME_FAQ)}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. Hero Search Section — Practo Clean Style                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative pt-16 pb-12 overflow-hidden bg-surface-container-low/30 border-b border-outline-variant/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-on-surface mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700">
              Find top experts and book
              <br className="hidden sm:block" />
              appointments instantly.
            </h1>

            <p className="text-on-surface-variant text-lg sm:text-xl font-medium mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
              Zero waiting in line. Verified professionals. Real-time availability.
            </p>

            {/* Prominent Search Bar (Practo style) */}
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
              <div className="flex flex-col md:flex-row bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-outline-variant/20 p-2 gap-2">
                
                {/* Location Input */}
                <div className="flex items-center flex-1 px-4 py-3 bg-surface hover:bg-surface-container-low rounded-xl group transition-colors">
                  <MapPin className="w-5 h-5 text-outline-variant mr-3 flex-shrink-0 group-focus-within:text-primary transition-colors" />
                  <div className="flex flex-col flex-1 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">Location</span>
                    <input
                      className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-on-surface font-semibold text-sm w-full placeholder:text-outline/50 placeholder:font-medium"
                      value={locationQuery || location?.address || ''}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Your city or area..."
                    />
                  </div>
                </div>

                <div className="hidden md:block w-px h-12 bg-outline-variant/30 self-center mx-1" />

                {/* Search Query Input */}
                <div className="flex flex-1 items-center px-4 py-3 bg-surface hover:bg-surface-container-low rounded-xl group transition-colors">
                  <Search className="w-5 h-5 text-outline-variant mr-3 flex-shrink-0 group-focus-within:text-primary transition-colors" />
                  <div className="flex flex-col flex-1 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">Search</span>
                    <input
                      className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-on-surface font-semibold text-sm w-full placeholder:text-outline/50 placeholder:font-medium"
                      placeholder="Salons, clinics, spas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Link href={
                  location
                    ? `/explore?q=${encodeURIComponent(searchQuery)}&lat=${location.lat}&lng=${location.lng}${locationQuery ? `&city=${encodeURIComponent(locationQuery)}` : ''}`
                    : `/explore?q=${encodeURIComponent(searchQuery)}${locationQuery ? `&city=${encodeURIComponent(locationQuery)}` : ''}`
                } className="w-full md:w-auto">
                  <button className="w-full h-full min-h-[56px] bg-primary text-white px-8 rounded-xl font-bold hover:bg-primary/90 active:scale-95 transition-all text-sm md:text-base whitespace-nowrap">
                    Search
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. Large Category Cards (Practo style)                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-12 bg-surface">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: 'Salons & Barbers', desc: 'Haircuts, styling & grooming', icon: Scissors, href: '/explore?type=SALON' },
              { name: 'Clinics & Health', desc: 'Expert doctors & specialists', icon: Stethoscope, href: '/explore?type=CLINIC' },
              { name: 'Gyms & Fitness', desc: 'Trainers & workout sessions', icon: Dumbbell, href: '/explore?type=GYM' },
              { name: 'Spas & Wellness', desc: 'Massages & relaxation', icon: Flower2, href: '/explore?type=SPA' },
            ].map((cat) => (
              <Link key={cat.name} href={cat.href} className="group flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 sm:p-6 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <cat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1">{cat.name}</h3>
                <p className="text-xs sm:text-sm text-on-surface-variant font-medium line-clamp-2">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3. AI Recommended Section                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AiRecommendationsSection location={location} />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. Trending / Nearby Grid                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-surface-container-low/20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface mb-2">
                {location ? 'Top places near you' : 'Popular in your city'}
              </h2>
              <p className="text-on-surface-variant text-sm font-medium">
                Book appointments at the highest rated spots.
              </p>
            </div>
            <Link href="/explore">
              <button className="text-sm font-bold text-primary hover:underline underline-offset-4 px-4 py-2 bg-primary/5 rounded-lg transition-colors">
                View All
              </button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[380px] skeleton rounded-4xl" />
              ))}
            </div>
          ) : popularShops?.data.length === 0 ? (
            <div className="card-m3 p-16 text-center">
              <MapPin className="w-16 h-16 text-outline-variant mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-on-surface mb-2">No spots found</h3>
              <p className="text-on-surface-variant text-lg mb-8">
                Try expanding your search or enabling location.
              </p>
              <Link href="/explore">
                <button className="btn-primary px-8 py-3">Browse Everything</button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularShops?.data.slice(0, 6).map((shop, idx) => (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <ShopCard shop={shop} userLocation={location || undefined} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 5. Clean Features Section                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-surface border-t border-outline-variant/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight mb-4">
            Why choose Overline?
          </h2>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto font-medium mb-16">
            We ensure a seamless, high-quality experience from booking to service completion.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: 'Verified Partners',
                desc: 'Every clinic, salon, and professional is thoroughly vetted for quality.',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: Zap,
                title: 'Instant Booking',
                desc: 'See live schedules and reserve your slot instantly. No phone calls needed.',
                color: 'text-secondary',
                bg: 'bg-secondary/10',
              },
              {
                icon: Calendar,
                title: 'Skip the Queue',
                desc: 'Track your wait time live. Walk in exactly when it is your turn.',
                color: 'text-tertiary',
                bg: 'bg-tertiary/10',
              },
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center p-8 rounded-3xl bg-surface-container-lowest shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-outline-variant/20 hover:-translate-y-1 transition-transform">
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center mb-6',
                  feature.bg
                )}>
                  <feature.icon className={cn('w-8 h-8', feature.color)} />
                </div>
                <h4 className="text-xl font-bold text-on-surface mb-3">{feature.title}</h4>
                <p className="text-on-surface-variant font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 7. Data Transparency Section (Google Requirement)          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-surface-container-lowest border-t border-outline-variant/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card-m3 p-8 md:p-12 text-center bg-gradient-to-b from-transparent to-primary/5">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight mb-4">
              Your Privacy and Data Security
            </h2>
            <p className="text-on-surface-variant text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed mb-8">
              At Overline, we take your privacy seriously. We only request the essential information needed to book your appointments, send confirmation receipts, and allow service providers to contact you regarding your queue status.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8 text-left">
              <div className="p-6 rounded-2xl bg-surface border border-outline-variant/20">
                <h4 className="font-bold text-on-surface mb-2">Google Sign-In</h4>
                <p className="text-sm text-on-surface-variant">We use Google to securely authenticate your account using your name and email. No passwords required.</p>
              </div>
              <div className="p-6 rounded-2xl bg-surface border border-outline-variant/20">
                <h4 className="font-bold text-on-surface mb-2">Phone Number</h4>
                <p className="text-sm text-on-surface-variant">Used solely to verify your identity to prevent spam bookings and to send you live queue updates.</p>
              </div>
              <div className="p-6 rounded-2xl bg-surface border border-outline-variant/20">
                <h4 className="font-bold text-on-surface mb-2">No Data Selling</h4>
                <p className="text-sm text-on-surface-variant">Your personal information is never sold to third parties. It is strictly shared with the specific shop you book at.</p>
              </div>
            </div>
            <Link href="/privacy" className="text-primary font-bold hover:underline underline-offset-4">
              Read our full Privacy Policy →
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}

function AiRecommendationsSection({ location }: { location: { lat: number; lng: number; address?: string } | null }) {
  const { data: recommendations, isLoading, isError } = useAiRecommendations(8);

  if (!location) {
    return (
      <section className="py-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-m3 p-12">
            <Sparkles className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="text-xl font-bold text-on-surface mb-2">Personalized recommendations</h3>
            <p className="text-on-surface-variant mb-4">Enable location to get AI-powered picks just for you</p>
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return null; // Gracefully hide the section if the AI endpoint fails
  }

  return (
    <section className="py-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-black text-on-surface tracking-tight">✦ For you</h2>
          <span className="badge-ai">AI Pick</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[280px] h-[300px] rounded-3xl animate-shimmer" />
              ))
            : (recommendations || []).slice(0, 8).map((shop: any) => (
                <div key={shop.id} className="flex-shrink-0 w-[280px]">
                  <ShopCard shop={shop} userLocation={location} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
