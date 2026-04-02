import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Search, MapPin, SlidersHorizontal, X, Navigation } from 'lucide-react';
import { Input, Button, Card, Loading, LocationPicker } from '@/components/ui';
import { ShopCard } from '@/components/shop';
import { ShopMap } from '@/components/map';
import { useShops } from '@/hooks';
import { cn } from '@/lib/utils';

export default function ExplorePage() {
  const router = useRouter();
  const { q, type, city } = router.query;

  const [searchQuery, setSearchQuery] = React.useState((q as string) || '');
  const [selectedType, setSelectedType] = React.useState<string | undefined>(type as string);
  const [selectedCity, setSelectedCity] = React.useState((city as string) || '');
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');
  const [location, setLocation] = React.useState<{ lat: number; lng: number; address?: string } | undefined>();

  const extractCityFromAddress = React.useCallback((address?: string) => {
    if (!address) return '';
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length >= 3) return parts[parts.length - 2];
    return parts[0];
  }, []);

  React.useEffect(() => {
    setSelectedCity((city as string) || '');
  }, [city]);

  React.useEffect(() => {
    const cityFromLocation = extractCityFromAddress(location?.address);
    if (cityFromLocation && cityFromLocation.toLowerCase() !== 'current location') {
      setSelectedCity(cityFromLocation);
    }
  }, [location?.address, extractCityFromAddress]);

  const { data: shops, isLoading, error } = useShops({
    query: searchQuery,
    city: selectedCity || undefined,
    type: selectedType as 'SALON' | 'CLINIC' | undefined,
    limit: 20,
    latitude: location?.lat || undefined,
    longitude: location?.lng || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push({
      pathname: '/explore',
      query: {
        ...(searchQuery && { q: searchQuery }),
        ...(selectedType && { type: selectedType }),
        ...(selectedCity && { city: selectedCity }),
        ...(location && location.address && { address: location.address }),
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType(undefined);
    setSelectedCity('');
    setLocation(undefined);
    router.push('/explore');
  };

  const typeOptions = [
    { value: undefined, label: 'All' },
    { value: 'SALON', label: 'Salons & Barbers' },
    { value: 'CLINIC', label: 'Clinics' },
  ];

  return (
    <>
      <Head>
        <title>Explore - Overline</title>
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-[#F8F9FA] pb-24">
        {/* Abstract Premium Background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary-400/20 via-purple-400/10 to-transparent blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent-400/10 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

        <div className="container-app pt-8 pb-24 relative z-10">
          {/* Main Title */}
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-lexo-black tracking-tight mb-2">
              Explore Spaces
            </h1>
            <p className="text-lg text-lexo-gray font-medium">Discover premium grooming and wellness spots.</p>
          </div>

          {/* Search & Filters (Glassmorphism) */}
          <div className="mb-10 bg-white/60 backdrop-blur-xl border border-white/40 p-4 md:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <form onSubmit={handleSearch} className="flex flex-col gap-2 md:flex-row md:gap-2">
              <div className="flex-1 flex flex-col gap-2 md:flex-row md:gap-2">
                <Input
                  placeholder="Search for salons, clinics, services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-5 h-5" />}
                />
                <div className="w-full md:w-96">
                  <LocationPicker value={location} onChange={setLocation} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="hidden md:flex"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button
                  type="submit"
                  className="bg-lexo-black text-white hover:bg-lexo-dark rounded-xl h-12 px-8 font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Filter Tags */}
            {(selectedType || selectedCity || searchQuery || (location && location.address)) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-sm text-gray-500">Active filters:</span>
                {selectedCity && (
                  <button
                    onClick={() => setSelectedCity('')}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                  >
                    {selectedCity}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {selectedType && (
                  <button
                    onClick={() => setSelectedType(undefined)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {typeOptions.find((t) => t.value === selectedType)?.label}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    &quot;{searchQuery}&quot;
                    <X className="w-3 h-3" />
                  </button>
                )}
                {location && location.address && (
                  <button
                    onClick={() => {
                      setLocation(undefined);
                      setSelectedCity('');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                  >
                    <Navigation className="w-3 h-3" />
                    {location.address}
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card variant="bordered" className="mb-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="flex gap-2">
                    {typeOptions.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => setSelectedType(option.value)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                          selectedType === option.value
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Results */}
          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : selectedCity
                    ? `Shops in ${selectedCity}`
                    : location?.address
                      ? `Shops near ${location.address}`
                      : 'All Shops'}
              </h1>
              {shops && (
                <p className="text-gray-500 mt-1">
                  {shops.meta.total} {shops.meta.total === 1 ? 'result' : 'results'}
                  {selectedCity ? ` in ${selectedCity}` : location?.address ? ` near ${location.address}` : ''}
                </p>
              )}
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setViewMode('list')}
                className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all', viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition-all', viewMode === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
              >
                Map
              </button>
            </div>
          </div>

          {isLoading ? (
            <Loading text="Finding shops..." />
          ) : error ? (
            <Card variant="bordered" className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Could not load shops</h3>
              <p className="text-gray-500 mb-4">Please try again. If this keeps happening, check your network connection.</p>
              <Button variant="outline" onClick={() => router.replace(router.asPath)}>
                Retry
              </Button>
            </Card>
          ) : shops?.data.length === 0 ? (
            <Card variant="bordered" className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No shops found
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </Card>
          ) : viewMode === 'map' ? (
            <div className="h-[600px] w-full mt-6">
              <ShopMap shops={shops?.data || []} userLocation={location} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
              {shops?.data.map((shop) => (
                <ShopCard key={shop.id} shop={shop} userLocation={location} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
