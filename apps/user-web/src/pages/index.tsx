import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  Search, MapPin, Scissors, Stethoscope, ArrowRight,
  Loader2, Dumbbell, Flower2, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShopCard, ShopMap } from '@/components/shop';
import { useShops, useLocation, useAiRecommendations } from '@/hooks';
import { ElectricCard } from '@/components/ElectricCard';
import { Globe } from '@/components/Globe';

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

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const categories = [
    { name: 'Salon', icon: Scissors, href: '/explore?type=SALON' },
    { name: 'Gym', icon: Dumbbell, href: '/explore?type=GYM' },
    { name: 'Clinic', icon: Stethoscope, href: '/explore?type=CLINIC' },
    { name: 'Spa', icon: Flower2, href: '/explore?type=SPA' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  return (
    <>
      <Head>
        <title>Overline — Premium Booking</title>
        <meta name="description" content="Find your next premium experience. Don't waste your time in line." />
      </Head>

      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. Hero Search Section — Gradient Banner                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-12 pb-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-4xl overflow-hidden bg-gradient-to-br from-primary to-secondary p-8 md:p-12 lg:p-16 text-white flex items-center">
            <div className="relative z-10 max-w-3xl">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={itemVariants} className="mb-5 inline-flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md px-4 py-2 border border-white/20">
                  <span className="text-sm font-bold tracking-wide">Overline</span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight"
                >
                  Find your next
                  <br />
                  premium experience.
                </motion.h1>

                <motion.p variants={itemVariants} className="text-white/85 text-lg md:text-xl font-semibold mb-8">
                  Don't waste your time in line.
                  <br />
                  Book instantly, track live queues, and skip the wait.
                </motion.p>

                {/* Search Bar */}
                <motion.div variants={itemVariants}>
                  <div className="flex flex-col md:flex-row gap-2 bg-surface-container-lowest p-2 rounded-2xl shadow-xl">
                    <div className="flex-1 flex items-center px-4 py-3 bg-surface-container-low rounded-xl group focus-within:ring-2 ring-primary/20 transition-all">
                      <Search className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-outline">What are you looking for?</span>
                        <input
                          className="bg-transparent border-none p-0 focus:ring-0 text-on-surface placeholder:text-outline-variant font-medium text-sm w-full"
                          placeholder="Salons, clinics, spas..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="hidden md:block w-px h-12 bg-outline-variant/20 mx-1 self-center" />

                    <div className="flex items-center px-4 py-3 bg-surface-container-low rounded-xl group focus-within:ring-2 ring-primary/20 transition-all min-w-[200px]">
                      <MapPin className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Location</span>
                        <input
                          className="bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium text-sm w-full"
                          value={locationQuery || location?.address || ''}
                          onChange={(e) => setLocationQuery(e.target.value)}
                          placeholder="Enter location..."
                        />
                      </div>
                    </div>

                    <Link href={location ? `/explore?q=${encodeURIComponent(searchQuery)}&lat=${location.lat}&lng=${location.lng}` : `/explore?q=${encodeURIComponent(searchQuery)}`}>
                      <button className="w-full md:w-auto bg-gradient-to-br from-primary to-primary-container text-white px-10 py-4 rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-primary/20 text-sm">
                        Explore
                      </button>
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            <div className="hidden lg:block absolute right-0 top-0 h-full w-1/2 opacity-50 pointer-events-none">
              <Globe />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. Category Icons Row                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-8 md:gap-16">
            {categories.map((cat) => (
              <Link key={cat.name} href={cat.href} className="flex flex-col items-center gap-3 group">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center group-active:scale-90 transition-transform shadow-sm group-hover:bg-primary-fixed/30">
                  <cat.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="text-[12px] font-bold tracking-wide uppercase text-on-surface-variant">
                  {cat.name}
                </span>
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
      <section className="py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <span className="text-xs font-bold tracking-widest text-secondary uppercase mb-2 block">
                Personalized for you
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">
                {location ? 'Recommended Nearby' : 'Popular Shops'}
              </h2>
            </div>
            <Link href="/explore">
              <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline underline-offset-4">
                View All <ArrowRight className="w-4 h-4" />
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
      {/* 5. Features Section                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-surface-container-low/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-8 leading-tight">
                Built for those who value their time.
              </h2>
              <p className="text-xl text-on-surface-variant font-medium mb-12 leading-relaxed max-w-lg">
                We've stripped away the noise. Just pure, seamless booking experiences that connect you to local experts instantly.
              </p>

              <div className="space-y-8">
                {[
                  {
                    icon: Zap,
                    title: 'Zero Wait',
                    desc: 'Live queue tracking means you walk in right when it is your turn.',
                    color: 'text-tertiary',
                    bg: 'bg-tertiary-fixed/30',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Verified Partners',
                    desc: 'We only onboard the most trusted local professionals.',
                    color: 'text-primary',
                    bg: 'bg-primary-fixed/30',
                  },
                  {
                    icon: Calendar,
                    title: 'Smart Scheduling',
                    desc: 'AI-optimized time slots to maximize your precious hours.',
                    color: 'text-secondary',
                    bg: 'bg-secondary-fixed/30',
                  },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-5 group cursor-pointer">
                    <div className={cn(
                      'flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                      feature.bg,
                      'group-hover:scale-110'
                    )}>
                      <feature.icon className={cn('w-6 h-6', feature.color)} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-on-surface mb-1">{feature.title}</h4>
                      <p className="text-on-surface-variant">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Map Preview */}
            <div className="relative h-[500px] w-full rounded-4xl overflow-hidden shadow-card-hover border border-outline-variant/10">
              <ShopMap
                shops={popularShops?.data || []}
                userLocation={location || undefined}
                className="w-full h-full"
                zoom={12}
              />
              {!popularShops?.data && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm z-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 6. Step-by-Step Guidance (Google Requirement)              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight mb-4">How Overline Works</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto font-medium">
              A seamless bridge between you and your next professional appointment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { 
                step: '01', 
                title: 'Discover', 
                desc: 'Browse verified premium salons, spas, and clinics near you or in any city.' 
              },
              { 
                step: '02', 
                title: 'Book Instantly', 
                desc: 'Select your service, choose an expert, and pick a time that fits your schedule.' 
              },
              { 
                step: '03', 
                title: 'Live Tracking', 
                desc: 'Monitor your place in the live queue and walk in exactly when you are expected.' 
              }
            ].map((s) => (
              <ElectricCard key={s.step} className="p-8 h-full rounded-[2.5rem]">
                <span className="text-5xl font-black text-primary/10 absolute top-4 right-8">{s.step}</span>
                <h3 className="text-2xl font-black text-on-surface mb-4 leading-tight relative">{s.title}</h3>
                <p className="text-on-surface-variant leading-relaxed relative">{s.desc}</p>
              </ElectricCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 7. Data Transparency Section (Google Requirement)          */}
      {/* ═══════════════════════════════════════════════════════════ */}

    </>
  );
}

function AiRecommendationsSection({ location }: { location: { lat: number; lng: number; address?: string } | null }) {
  const { data: recommendations, isLoading } = useAiRecommendations(8);

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
