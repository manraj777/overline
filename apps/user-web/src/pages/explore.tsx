import React from 'react';
import { useRouter } from 'next/router';
import { Search, MapPin, SlidersHorizontal, X, Navigation, Sparkles } from 'lucide-react';
import { Input, Button, Card, Loading, LocationPicker } from '@/components/ui';
import { ShopCard } from '@/components/shop';
import { ShopMap } from '@/components/map';
import { useShops } from '@/hooks';
import { cn } from '@/lib/utils';
import { SeoHead, jsonLd } from '@/components/seo/SeoHead';

const TYPE_LABELS: Record<string, string> = {
  SALON: 'Salons',
  BARBER: 'Barbershops',
  SPA: 'Spas',
  CLINIC: 'Clinics',
  GYM: 'Gyms',
};

export default function ExplorePage() {
  const router = useRouter();
  const { q, type, city, radiusKm, minRating, maxPrice } = router.query;

  const [searchQuery, setSearchQuery] = React.useState((q as string) || '');
  const [selectedType, setSelectedType] = React.useState<string | undefined>(type as string);
  const [selectedCity, setSelectedCity] = React.useState((city as string) || '');
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');
  const [location, setLocation] = React.useState<{ lat: number; lng: number; address?: string } | undefined>();
  const [selectedRadiusKm, setSelectedRadiusKm] = React.useState<number | undefined>(radiusKm ? Number(radiusKm) : undefined);
  const [selectedMaxPrice, setSelectedMaxPrice] = React.useState<number | undefined>(maxPrice ? Number(maxPrice) : undefined);
  const [selectedMinRating, setSelectedMinRating] = React.useState<number | undefined>(minRating ? Number(minRating) : undefined);

  const extractCityFromAddress = React.useCallback((address?: string) => {
    if (!address) return '';
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length >= 3) return parts[parts.length - 2];
    return parts[0];
  }, []);

  React.useEffect(() => {
    setSelectedCity((city as string) || '');
  }, [city]);

  React.useEffect(() => {
    setSelectedRadiusKm(radiusKm ? Number(radiusKm) : undefined);
    setSelectedMaxPrice(maxPrice ? Number(maxPrice) : undefined);
    setSelectedMinRating(minRating ? Number(minRating) : undefined);
  }, [radiusKm, maxPrice, minRating]);

  React.useEffect(() => {
    const cityFromLocation = extractCityFromAddress(location?.address);
    if (cityFromLocation && cityFromLocation.toLowerCase() !== 'current location') {
      setSelectedCity(cityFromLocation);
    }
  }, [location?.address, extractCityFromAddress]);

  const shouldApplyLocationFilter = !!(
    location?.lat &&
    location?.lng &&
    location?.address &&
    location.address.toLowerCase() !== 'current location'
  );

  React.useEffect(() => {
    if (viewMode !== 'map' || location) {
      return;
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current Location',
        });
      },
      () => {
        // Keep existing fallback behavior if location is denied.
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [viewMode, location]);

  const { data: shops, isLoading, error } = useShops({
    query: searchQuery,
    city: selectedCity || undefined,
    type: selectedType as 'SALON' | 'CLINIC' | undefined,
    radiusKm: selectedRadiusKm,
    minRating: selectedMinRating,
    maxPrice: selectedMaxPrice,
    limit: 20,
    latitude: shouldApplyLocationFilter ? location?.lat : undefined,
    longitude: shouldApplyLocationFilter ? location?.lng : undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push({
      pathname: '/explore',
      query: {
        ...(searchQuery && { q: searchQuery }),
        ...(selectedType && { type: selectedType }),
        ...(selectedCity && { city: selectedCity }),
        ...(selectedRadiusKm && { radiusKm: selectedRadiusKm }),
        ...(selectedMinRating && { minRating: selectedMinRating }),
        ...(selectedMaxPrice && { maxPrice: selectedMaxPrice }),
        ...(location && location.address && { address: location.address }),
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType(undefined);
    setSelectedCity('');
    setSelectedRadiusKm(undefined);
    setSelectedMaxPrice(undefined);
    setSelectedMinRating(undefined);
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
      <SeoHead
        title={`Explore ${selectedType ? TYPE_LABELS[selectedType] || 'Shops' : 'Salons, Spas, Clinics & Gyms'}${selectedCity ? ` in ${selectedCity}` : ''}`}
        description={`Discover verified ${selectedType ? (TYPE_LABELS[selectedType] || 'shops').toLowerCase() : 'salons, spas, clinics and gyms'}${selectedCity ? ` in ${selectedCity}` : ' near you'}. Real-time availability, transparent pricing, live queue status — book in seconds on Overline.`}
        canonical="/explore"
        jsonLd={jsonLd.breadcrumbs([
          { name: 'Home', url: '/' },
          { name: 'Explore', url: '/explore' },
        ])}
      />

      <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
        {/* ── Sidebar Filters ── */}
        <aside className={cn(
          'w-full md:w-80 lg:w-[320px] shrink-0 bg-surface-container-lowest border-r border-outline-variant/40 overflow-y-auto no-scrollbar transition-all',
          showFilters ? 'block' : 'hidden md:block'
        )}>
          <div className="p-6 space-y-8">
            {/* Filter Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold tracking-tight text-on-surface">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* AI Recommendation Toggle */}
            <div className="p-4 bg-primary-fixed/20 rounded-2xl border border-primary-fixed">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold text-on-surface">AI Recommends</span>
                </div>
                <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">
                Personalized results based on your booking history.
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <label className="label-m3">Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setSelectedType(option.value)}
                    className={cn(
                      'flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95',
                      selectedType === option.value
                        ? 'bg-primary text-white shadow-button'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/10'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div className="space-y-3">
              <label className="label-m3">Distance</label>
              <div className="flex flex-wrap gap-2">
                {[1, 5, 10, 25].map((km) => (
                  <button
                    key={km}
                    onClick={() => setSelectedRadiusKm(selectedRadiusKm === km ? undefined : km)}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-medium cursor-pointer transition-all',
                      selectedRadiusKm === km
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/10 hover:bg-surface-container-high'
                    )}
                  >
                    {km}km
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <label className="label-m3">Price Range</label>
              <div className="flex items-center gap-2">
                {[
                  { label: '₹', value: 500 },
                  { label: '₹₹', value: 1500 },
                  { label: '₹₹₹', value: 3000 },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setSelectedMaxPrice(selectedMaxPrice === option.value ? undefined : option.value)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95',
                      selectedMaxPrice === option.value
                        ? 'bg-primary text-white shadow-button'
                        : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/10 hover:border-primary/30'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-3">
              <label className="label-m3">Rating</label>
              <div className="flex flex-col gap-2">
                {[4.8, 4.5, 4.0, 3.5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelectedMinRating(selectedMinRating === rating ? undefined : rating)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-sm font-semibold text-left transition-colors',
                      selectedMinRating === rating
                        ? 'bg-primary text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                    )}
                  >
                    {rating}+ Stars
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <label className="label-m3">Location</label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <section className="flex-1 flex flex-col md:flex-row bg-surface overflow-hidden">
          {/* List View */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">
            {/* Header */}
            <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-on-surface leading-none mb-2">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : selectedCity
                      ? `Shops in ${selectedCity}`
                      : location?.address
                        ? `Shops near ${location.address}`
                        : 'Search Results'}
                </h1>
                {shops && (
                  <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                    <MapPin className="w-4 h-4" />
                    <p className="font-medium italic">
                      {shops.meta.total} {shops.meta.total === 1 ? 'location' : 'locations'} found
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </button>

                {/* View Toggle */}
                <div className="flex bg-surface-container-high/50 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                      viewMode === 'list'
                        ? 'bg-surface-container-lowest shadow-sm text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    )}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
                      viewMode === 'map'
                        ? 'bg-surface-container-lowest shadow-sm text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    )}
                  >
                    Map
                  </button>
                </div>
              </div>
            </header>

            <form onSubmit={handleSearch} className="mb-6 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search shops by name, service, city..."
                  className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low pl-9 pr-3 py-2.5 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button type="submit" className="btn-primary px-5 py-2.5 text-sm font-bold rounded-xl">
                Search
              </button>
            </form>

            {/* Active Filter Tags */}
            {(selectedType || selectedCity || searchQuery || selectedRadiusKm || selectedMaxPrice || selectedMinRating) && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {selectedCity && (
                  <button
                    onClick={() => setSelectedCity('')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-fixed text-primary rounded-full text-xs font-bold"
                  >
                    {selectedCity} <X className="w-3 h-3" />
                  </button>
                )}
                {selectedType && (
                  <button
                    onClick={() => setSelectedType(undefined)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary-fixed text-secondary rounded-full text-xs font-bold"
                  >
                    {typeOptions.find((t) => t.value === selectedType)?.label} <X className="w-3 h-3" />
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-high text-on-surface rounded-full text-xs font-bold"
                  >
                    &quot;{searchQuery}&quot; <X className="w-3 h-3" />
                  </button>
                )}
                {!!selectedRadiusKm && (
                  <button
                    onClick={() => setSelectedRadiusKm(undefined)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-tertiary-fixed text-tertiary rounded-full text-xs font-bold"
                  >
                    {selectedRadiusKm}km <X className="w-3 h-3" />
                  </button>
                )}
                {!!selectedMaxPrice && (
                  <button
                    onClick={() => setSelectedMaxPrice(undefined)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-high text-on-surface rounded-full text-xs font-bold"
                  >
                    up to ₹{selectedMaxPrice} <X className="w-3 h-3" />
                  </button>
                )}
                {!!selectedMinRating && (
                  <button
                    onClick={() => setSelectedMinRating(undefined)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary-fixed text-secondary rounded-full text-xs font-bold"
                  >
                    {selectedMinRating}+ stars <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Results */}
            {isLoading ? (
              <Loading text="Finding shops..." />
            ) : error ? (
              <div className="card-m3 text-center py-12 px-8">
                <h3 className="text-lg font-bold text-on-surface mb-2">Could not load shops</h3>
                <p className="text-on-surface-variant mb-4">Please try again.</p>
                <button
                  onClick={() => router.replace(router.asPath)}
                  className="btn-tonal px-6 py-2"
                >
                  Retry
                </button>
              </div>
            ) : shops?.data.length === 0 ? (
              <div className="card-m3 text-center py-16 px-8">
                <MapPin className="w-12 h-12 text-outline-variant mx-auto mb-4" />
                <h3 className="text-lg font-bold text-on-surface mb-2">No shops found</h3>
                <p className="text-on-surface-variant mb-6">
                  Try adjusting your search or filters.
                </p>
                <button onClick={clearFilters} className="btn-tonal px-6 py-2">
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'map' ? (
              <div className="space-y-6">
                <div className="h-[600px] w-full rounded-3xl overflow-hidden shadow-card border border-outline-variant/10">
                  <ShopMap shops={shops?.data || []} userLocation={location} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-on-surface mb-3">Shop Cards</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {shops?.data.map((shop) => (
                      <ShopCard key={shop.id} shop={shop} userLocation={location} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {shops?.data.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} userLocation={location} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Map Panel */}
          {viewMode === 'list' && (
            <div className="hidden xl:block w-[400px] bg-surface-container-high/30 h-[calc(100vh-64px)] sticky top-16 border-l border-outline-variant/10">
              <div className="h-full relative">
                <ShopMap shops={shops?.data || []} userLocation={location} />
                {/* Floating Controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 bg-surface-container-lowest/90 backdrop-blur-xl p-2 rounded-2xl shadow-glass-strong border border-outline-variant/40">
                  <button className="p-2 bg-surface-container-low rounded-xl text-on-surface hover:bg-surface-container-high border border-outline-variant/10 transition-colors">
                    <span className="text-lg">+</span>
                  </button>
                  <button className="p-2 bg-surface-container-low rounded-xl text-on-surface hover:bg-surface-container-high border border-outline-variant/10 transition-colors">
                    <span className="text-lg">−</span>
                  </button>
                  <div className="w-px bg-outline-variant/20 mx-1" />
                  <button className="p-2 bg-primary text-white rounded-xl flex items-center gap-2 px-4 text-xs font-bold shadow-button">
                    <Navigation className="w-4 h-4" />
                    Center
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
