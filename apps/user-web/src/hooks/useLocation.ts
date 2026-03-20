import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
    lat: number;
    lng: number;
    address?: string;
}

interface UseLocationResult {
    location: UserLocation | null;
    loading: boolean;
    error: string | null;
    requestLocation: () => void;
}

/**
 * Hook to detect the user's current location via the browser Geolocation API.
 * If `autoDetect` is true, it will request location on mount.
 * It also reverse-geocodes coordinates to a human-readable address using the
 * free Nominatim (OpenStreetMap) API.
 */
export function useLocation(autoDetect = false): UseLocationResult {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hydrate location state from storage safely on client mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('user_last_location');
                if (cached) setLocation(JSON.parse(cached));
            } catch (e) {
                console.error('Failed to parse cached location', e);
            }
        }
    }, []);

    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | undefined> => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en',
                    },
                }
            );
            if (!res.ok) return undefined;
            const data = await res.json();
            if (data?.address) {
                const parts: string[] = [];
                const addr = data.address;
                if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
                if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                if (addr.state) parts.push(addr.state);
                return parts.join(', ') || data.display_name;
            }
            return data?.display_name;
        } catch {
            return undefined;
        }
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const address = await reverseGeocode(latitude, longitude);
                const newLocation = { lat: latitude, lng: longitude, address };
                setLocation(newLocation);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user_last_location', JSON.stringify(newLocation));
                }
                setLoading(false);
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError('Location permission denied. Please enable it in your browser settings.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError('Location information is unavailable.');
                        break;
                    case err.TIMEOUT:
                        setError('Location request timed out. Please try again.');
                        break;
                    default:
                        setError('An unknown error occurred while getting your location.');
                }
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000 * 60 * 5, // Cache for 5 minutes
            }
        );
    }, [reverseGeocode]);

    useEffect(() => {
        if (autoDetect) {
            requestLocation();
        }
    }, [autoDetect, requestLocation]);

    return { location, loading, error, requestLocation };
}
