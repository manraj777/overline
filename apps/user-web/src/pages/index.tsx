import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Search, MapPin, Scissors, Stethoscope, ArrowRight, Star, Clock } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { ShopCard } from '@/components/shop';
import { useShops } from '@/hooks';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { data: popularShops, isLoading } = useShops({ limit: 6 });

  const categories = [
    {
      name: 'Salons & Barbers',
      icon: Scissors,
      description: 'Haircuts, styling, and grooming',
      href: '/explore?type=SALON',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      name: 'Clinics',
      icon: Stethoscope,
      description: 'Medical consultations and checkups',
      href: '/explore?type=CLINIC',
      color: 'bg-emerald-100 text-emerald-600',
    },
  ];

  const features = [
    {
      icon: Clock,
      title: 'Real-time Queue',
      description: 'See live wait times and skip the queue',
    },
    {
      icon: Star,
      title: 'Verified Reviews',
      description: 'Read honest reviews from real customers',
    },
    {
      icon: MapPin,
      title: 'Nearby Shops',
      description: 'Find the best places close to you',
    },
  ];

  return (
    <>
      <Head>
        <title>Overline - Book Appointments & Skip the Queue</title>
      </Head>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container-app py-12 md:py-20">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Book Appointments.
              <br />
              Skip the Queue.
            </h1>
            <p className="text-primary-100 text-lg">
              Find and book appointments at the best salons and clinics near you.
              See real-time queue status and never wait again.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-xl p-2 flex gap-2 shadow-lg">
              <div className="flex-1">
                <Input
                  placeholder="Search for salons, clinics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-5 h-5" />}
                  className="border-0 focus:ring-0"
                />
              </div>
              <Link href={`/explore?q=${searchQuery}`}>
                <Button size="lg">Search</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-app py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <Link key={category.name} href={category.href}>
              <Card
                variant="bordered"
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${category.color}`}
                  >
                    <category.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Shops */}
      <section className="container-app py-12 bg-gray-50 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Popular Near You</h2>
          <Link
            href="/explore"
            className="text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularShops?.data.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="container-app py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Why Choose Overline?
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            We make booking appointments effortless and help you save time with
            real-time queue information.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-app py-12">
        <Card className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-center py-10 px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to skip the queue?
          </h2>
          <p className="text-primary-100 mb-6 max-w-md mx-auto">
            Join thousands of users who save time by booking ahead.
          </p>
          <Link href="/explore">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary-600 hover:bg-gray-100"
            >
              Explore Shops
            </Button>
          </Link>
        </Card>
      </section>
    </>
  );
}
