import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Scissors, Stethoscope, ArrowRight, Star,
  Navigation, Loader2, Sparkles, Zap, ShieldCheck, HeartHandshake
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ShopCard, ShopMap } from '@/components/shop';
import { useShops, useLocation, useAiRecommendations } from '@/hooks';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { location, loading: locationLoading, requestLocation } = useLocation(true);

  const { data: popularShops, isLoading } = useShops({
    limit: 5, // 5 fits a bento box layout well (2 large, 3 small)
    latitude: location?.lat,
    longitude: location?.lng,
    radiusKm: 50,
  });

  const categories = [
    { name: 'Haircut & Styling', icon: Scissors, href: '/explore?type=SALON' },
    { name: 'Medical Checkups', icon: Stethoscope, href: '/explore?type=CLINIC' },
    { name: 'Beard Trimming', icon: Scissors, href: '/explore?type=SALON' },
    { name: 'Dental Care', icon: Stethoscope, href: '/explore?type=CLINIC' },
    { name: 'Massage Therapy', icon: HeartHandshake, href: '/explore?type=SALON' },
    { name: 'Skin Consultations', icon: Stethoscope, href: '/explore?type=CLINIC' },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Zero Wait',
      desc: 'Live queue tracking means you walk in right when it is your turn.',
    },
    {
      icon: ShieldCheck,
      title: 'Verified Partners',
      desc: 'We only onboard the most trusted local professionals.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <Head>
        <title>Overline - Premium Booking</title>
        <meta name="description" content="Experience premium booking with real-time queue tracking." />
      </Head>

      {/* ========================================================================= */}
      {/* 1. Asymmetric Hero Section                                                */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-24 md:pb-32 bg-[#F8F9FA]">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary-400/20 via-purple-400/10 to-transparent blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent-400/10 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            <motion.div
              className="lg:col-span-7"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-lexo-black text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span>The Future of Booking</span>
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-5xl sm:text-7xl lg:text-8xl font-black text-lexo-black leading-[0.95] tracking-tighter mb-8 text-balance">
                Don't waste <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lexo-charcoal to-lexo-gray">your time</span> <br />
                in line.
              </motion.h1>

              <motion.p variants={itemVariants} className="text-xl md:text-2xl text-lexo-gray font-medium max-w-xl mb-12">
                Discover premium salons and clinics. Track live queues and walk in exactly when it's your turn.
              </motion.p>

              {/* Minimal Search Bar */}
              <motion.div variants={itemVariants} className="max-w-xl">
                <div className="bg-white rounded-full p-2 flex gap-2 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100">
                  <div className="flex-1">
                    <Input
                      placeholder="What are you looking for?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      leftIcon={<Search className="w-6 h-6 text-lexo-gray px-1" />}
                      className="border-0 focus:ring-0 text-lg h-14 bg-transparent outline-none shadow-none"
                    />
                  </div>
                  <Link
                    href={`/explore?q=${encodeURIComponent(searchQuery)}${location ? `&lat=${location.lat}&lng=${location.lng}` : ''}`}
                  >
                    <Button className="h-full px-8 rounded-full bg-lexo-black hover:bg-lexo-dark text-white text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-md">
                      Find
                    </Button>
                  </Link>
                </div>

                {/* Location Detection */}
                <div className="mt-6 flex items-center gap-3 px-4">
                  {location ? (
                    <div className="flex items-center gap-2 text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-full">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{location.address || 'Location detected'}</span>
                    </div>
                  ) : locationLoading ? (
                    <div className="flex items-center gap-2 text-lexo-gray font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Detecting location...</span>
                    </div>
                  ) : (
                    <button
                      onClick={requestLocation}
                      className="flex items-center gap-2 text-lexo-gray hover:text-lexo-black font-medium transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      <span className="text-sm border-b border-lexo-gray hover:border-lexo-black border-dashed">Use my current location</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Asymmetric Right Image/Map */}
            <motion.div
              className="lg:col-span-5 hidden lg:block h-full"
              initial={{ opacity: 0, x: 100, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 1, type: "spring", bounce: 0.4 }}
            >
              <div className="relative h-full min-h-[500px] w-full mt-4">
                <div className="absolute inset-0 bg-lexo-charcoal rounded-[3rem] translate-x-4 translate-y-4 -z-10 opacity-20" />
                <div className="w-full h-[600px] rounded-[3rem] overflow-hidden shadow-2xl relative border-4 border-white">
                  <ShopMap
                    shops={popularShops?.data || []}
                    userLocation={location || undefined}
                    className="w-full h-full"
                    zoom={12}
                  />
                  {!popularShops?.data && isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm z-20">
                      <Loader2 className="w-8 h-8 animate-spin text-lexo-black" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. Category Tag Marquee                                                   */}
      {/* ========================================================================= */}
      <section className="py-12 border-y border-gray-100 bg-white overflow-hidden flex whitespace-nowrap group">
        <div className="animate-marquee flex gap-4 pr-4 group-hover:[animation-play-state:paused]">
          {[...categories, ...categories].map((cat, i) => (
            <Link key={i} href={cat.href}>
              <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-gray-200 hover:border-lexo-black hover:bg-lexo-black hover:text-white transition-all duration-300 group/item cursor-pointer shadow-sm">
                <cat.icon className="w-5 h-5 text-lexo-gray group-hover/item:text-white transition-colors" />
                <span className="text-lg font-bold text-lexo-charcoal group-hover/item:text-white transition-colors">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2.5 AI Recommendations                                                    */}
      {/* ========================================================================= */}
      <AiRecommendationsSection location={location} />

      {/* ========================================================================= */}
      {/* 3. Bento Box Featured Shops                                               */}
      {/* ========================================================================= */}
      <section className="py-24 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-lexo-black tracking-tight mb-4 text-balance">
                Trending {location ? 'Near You' : 'Spots'}
              </h2>
              <p className="text-xl text-lexo-gray font-medium max-w-xl">
                The most booked and highly rated professionals right now.
              </p>
            </div>
            <Link href="/explore">
              <Button variant="outline" className="rounded-full border-2 border-gray-200 text-lexo-charcoal hover:border-lexo-black hover:bg-lexo-black hover:text-white font-bold px-8 h-14 text-lg transition-all duration-300">
                View All Directory
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 skeleton" />
              ))}
            </div>
          ) : popularShops?.data.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-16 text-center border border-gray-200 shadow-sm">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-lexo-black mb-2">No spots found</h3>
              <p className="text-lexo-gray text-lg mb-8">Try expanding your search or enabling location.</p>
              <Link href="/explore">
                <Button className="rounded-full bg-lexo-black text-white px-8 h-12">Browse Everything</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[400px]">
              {popularShops?.data.slice(0, 5).map((shop, idx) => (
                <div
                  key={shop.id}
                  className={cn(
                    "hover-scale-wrapper transition-transform duration-500",
                    // Bento layout logic: First two cards are wide on lg screens
                    idx === 0 ? "lg:col-span-2" : "",
                    idx === 1 ? "lg:col-span-1" : "",
                    idx > 2 ? "lg:col-span-1" : ""
                  )}
                >
                  <ShopCard shop={shop} userLocation={location || undefined} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. Core Features (Minimalist Glass Cards)                                 */}
      {/* ========================================================================= */}
      <section className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-lexo-black tracking-tight mb-8 text-balance">
                Built for those who value their time.
              </h2>
              <p className="text-xl text-lexo-gray font-medium mb-10 leading-relaxed max-w-lg">
                We've stripped away the noise. Just pure, seamless booking experiences that connect you to local experts instantly.
              </p>

              <div className="space-y-6">
                {features.map((feature, i) => (
                  <div key={i} className="flex gap-6 group cursor-pointer">
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-center group-hover:bg-lexo-black group-hover:text-white transition-all duration-300">
                      <feature.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-lexo-black mb-2">{feature.title}</h4>
                      <p className="text-lexo-gray text-lg">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-[600px] w-full bg-lexo-light rounded-[3rem] overflow-hidden border border-gray-200">
              {/* Abstract decorative graphic replacing an app screenshot */}
              <div className="absolute inset-0 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1516975080661-46bace915715?auto=format&fit=crop&q=80')] bg-cover bg-center blur-sm opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-lexo-charcoal/90 to-transparent flex items-center justify-center p-8">
                <div className="glass rounded-[2rem] p-10 max-w-sm w-full shadow-2xl backdrop-blur-3xl transform rotate-[-3deg] hover:rotate-0 transition-all duration-500">
                  <div className="flex justify-between items-center mb-8 pb-8 border-b border-gray-200/50">
                    <div className="w-12 h-12 bg-lexo-black rounded-xl"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div className="w-full h-12 bg-gray-100 rounded-xl"></div>
                    <div className="w-3/4 h-12 bg-gray-100 rounded-xl"></div>
                  </div>
                  <div className="w-full h-16 bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl shadow-lg mt-12 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Confirmed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}

function AiRecommendationsSection({ location }: { location: { lat: number; lng: number; address?: string } | null }) {
  const { data: recommendations, isLoading } = useAiRecommendations(8);

  if (!location) {
    return (
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-lexo-black mb-2">Personalized recommendations</h3>
          <p className="text-lexo-gray mb-4">Enable location to get AI-powered picks just for you</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-3xl font-black text-lexo-black tracking-tight">
            ✨ Picked for you
          </h2>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold">
            <Sparkles className="w-3 h-3" /> AI powered
          </span>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[300px] h-[360px] rounded-2xl bg-gray-100 animate-pulse" />
              ))
            : (recommendations || []).slice(0, 8).map((shop: any) => (
                <div key={shop.id} className="flex-shrink-0 w-[300px]">
                  <ShopCard shop={shop} userLocation={location} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
