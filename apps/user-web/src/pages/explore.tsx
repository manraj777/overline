import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react';
import { Input, Button, Card, Loading } from '@/components/ui';
import { ShopCard } from '@/components/shop';
import { useShops } from '@/hooks';
import { cn } from '@/lib/utils';

export default function ExplorePage() {
  const router = useRouter();
  const { q, type } = router.query;

  const [searchQuery, setSearchQuery] = React.useState((q as string) || '');
  const [selectedType, setSelectedType] = React.useState<string | undefined>(
    type as string
  );
  const [showFilters, setShowFilters] = React.useState(false);

  const { data: shops, isLoading } = useShops({
    query: searchQuery,
    type: selectedType as 'SALON' | 'CLINIC' | undefined,
    limit: 20,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push({
      pathname: '/explore',
      query: {
        ...(searchQuery && { q: searchQuery }),
        ...(selectedType && { type: selectedType }),
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType(undefined);
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

      <div className="container-app py-6">
        {/* Search & Filters */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search for salons, clinics, services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="hidden md:flex"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button type="submit">Search</Button>
          </form>

          {/* Filter Tags */}
          {(selectedType || searchQuery) && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-gray-500">Active filters:</span>
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
                  "{searchQuery}"
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
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {searchQuery ? `Results for "${searchQuery}"` : 'All Shops'}
          </h1>
          {shops && (
            <p className="text-gray-500 mt-1">
              {shops.meta.total} {shops.meta.total === 1 ? 'result' : 'results'}
            </p>
          )}
        </div>

        {isLoading ? (
          <Loading text="Finding shops..." />
        ) : shops?.data.length === 0 ? (
          <Card variant="bordered" className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No shops found
            </h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops?.data.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
