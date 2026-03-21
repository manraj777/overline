import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X, Loader2, Search } from 'lucide-react';

interface LocationPickerProps {
  value?: { lat: number; lng: number; address?: string };
  onChange: (value: { lat: number; lng: number; address?: string }) => void;
  placeholder?: string;
  compact?: boolean;
}

interface GeocodeSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Search location...',
  compact = false,
}) => {
  const [input, setInput] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync external value changes
  useEffect(() => {
    setInput(value?.address || '');
  }, [value?.address]);

  // Forward geocode search using Nominatim
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data: GeocodeSuggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch {
      // Silently fail
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAddress(val);
    }, 400);
  };

  // Select a suggestion
  const handleSelectSuggestion = (suggestion: GeocodeSuggestion) => {
    const addr = suggestion.address;
    const parts: string[] = [];
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood || '');
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village || '');
    if (addr.state) parts.push(addr.state);
    const shortAddress = parts.join(', ') || suggestion.display_name;

    setInput(shortAddress);
    setShowSuggestions(false);
    onChange({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      address: shortAddress,
    });
  };

  // Use browser geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Reverse geocode
        let address = 'Current Location';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.address) {
              const parts: string[] = [];
              const addr = data.address;
              if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
              if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
              if (addr.state) parts.push(addr.state);
              address = parts.join(', ') || data.display_name || address;
            }
          }
        } catch {
          // Use fallback address
        }

        setInput(address);
        onChange({ lat: latitude, lng: longitude, address });
        setIsLocating(false);
      },
      () => {
        alert('Unable to get your location. Please check your browser permissions.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Clear location
  const handleClear = () => {
    setInput('');
    setSuggestions([]);
    onChange({ lat: 0, lng: 0, address: '' });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            className={`w-full border border-gray-200 rounded-lg pl-9 pr-8 ${compact ? 'py-1.5 text-sm' : 'py-2'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`}
            placeholder={placeholder}
            value={input}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {input && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current location button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className={`flex items-center gap-1 ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
            } bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 
            transition-colors font-medium whitespace-nowrap disabled:opacity-50 border border-primary-200`}
          title="Use current location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {!compact && <span>{isLocating ? 'Locating...' : 'Near me'}</span>}
        </button>
      </div>

      {/* Location indicator */}
      {value && value.lat !== 0 && value.address && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-primary-600">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{value.address}</span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, i) => {
            const addr = suggestion.address;
            const parts: string[] = [];
            if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood || '');
            if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village || '');
            if (addr.state) parts.push(addr.state);
            const shortLabel = parts.join(', ') || suggestion.display_name;

            return (
              <button
                key={`${suggestion.lat}-${suggestion.lon}-${i}`}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-2 transition-colors border-b border-gray-50 last:border-0"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {shortLabel}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {suggestion.display_name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
