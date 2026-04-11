import React from 'react';
import { GoogleMap, Marker, Autocomplete, useLoadScript } from '@react-google-maps/api';
import { MapPin, Search, Crosshair } from 'lucide-react';

const libraries: ('places')[] = ['places'];
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // Center of India
const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c8d7e8' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

export interface LocationData {
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
  city?: string;
  locality?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface LocationPickerProps {
  value?: LocationData;
  onChange: (location: LocationData) => void;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries,
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = React.useState(
    value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER
  );
  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const [searchAddress, setSearchAddress] = React.useState(value?.formattedAddress || '');
  const [manualLat, setManualLat] = React.useState(String(value?.lat || ''));
  const [manualLng, setManualLng] = React.useState(String(value?.lng || ''));
  const [showManualInputs, setShowManualInputs] = React.useState(false);

  const extractAddressComponents = React.useCallback((place: google.maps.places.PlaceResult): Partial<LocationData> => {
    const components = place.address_components || [];
    const get = (type: string) => components.find(c => c.types.includes(type))?.long_name || '';

    return {
      city: get('locality') || get('administrative_area_level_2'),
      locality: get('sublocality_level_1') || get('sublocality'),
      state: get('administrative_area_level_1'),
      country: get('country'),
      postalCode: get('postal_code'),
    };
  }, []);

  const handlePlaceChanged = React.useCallback(() => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const newPos = { lat, lng };

    setMarkerPosition(newPos);
    setManualLat(String(lat));
    setManualLng(String(lng));
    setSearchAddress(place.formatted_address || '');
    map?.panTo(newPos);
    map?.setZoom(17);

    const addressParts = extractAddressComponents(place);
    onChange({
      lat,
      lng,
      placeId: place.place_id,
      formattedAddress: place.formatted_address,
      ...addressParts,
    });
  }, [autocomplete, map, onChange, extractAddressComponents]);

  const handleMapClick = React.useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    setManualLat(String(lat));
    setManualLng(String(lng));
    onChange({ ...value, lat, lng } as LocationData);
  }, [onChange, value]);

  const handleMarkerDragEnd = React.useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    setManualLat(String(lat));
    setManualLng(String(lng));
    onChange({ ...value, lat, lng } as LocationData);
  }, [onChange, value]);

  const handleDetectLocation = React.useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newPos = { lat, lng };
        setMarkerPosition(newPos);
        setManualLat(String(lat));
        setManualLng(String(lng));
        map?.panTo(newPos);
        map?.setZoom(17);
        onChange({ ...value, lat, lng } as LocationData);
      },
      () => alert('Unable to detect your location'),
      { enableHighAccuracy: true }
    );
  }, [map, onChange, value]);

  const handleManualCoordinateApply = React.useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) return;
    const newPos = { lat, lng };
    setMarkerPosition(newPos);
    map?.panTo(newPos);
    map?.setZoom(17);
    onChange({ ...value, lat, lng } as LocationData);
  }, [manualLat, manualLng, map, onChange, value]);

  if (loadError) {
    return (
      <div className="rounded-2xl border border-error/20 bg-error-container/20 p-8 text-center">
        <p className="text-error font-bold">Failed to load Google Maps</p>
        <p className="text-sm text-on-surface-variant mt-2">Check your NEXT_PUBLIC_GOOGLE_MAPS_KEY environment variable.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-96 rounded-2xl bg-surface-container-low animate-pulse flex items-center justify-center">
        <p className="text-on-surface-variant text-sm font-medium">Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline z-10" />
        <Autocomplete
          onLoad={setAutocomplete}
          onPlaceChanged={handlePlaceChanged}
          options={{ componentRestrictions: { country: 'in' } }}
        >
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            placeholder="Search your shop address or locality..."
            className="input-m3 pl-11 pr-4"
          />
        </Autocomplete>
      </div>

      {/* Detect Location Button */}
      <button
        type="button"
        onClick={handleDetectLocation}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary-fixed/30 border border-primary/20 rounded-xl text-primary font-bold text-sm hover:bg-primary-fixed/50 transition-all active:scale-[0.98]"
      >
        <Crosshair className="w-4 h-4" />
        Detect My Current Location
      </button>

      {/* Map */}
      <div className="h-80 w-full rounded-2xl overflow-hidden border border-outline-variant/20 shadow-sm relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={markerPosition}
          zoom={15}
          onLoad={setMap}
          onClick={handleMapClick}
          options={{
            styles: MAP_STYLES as google.maps.MapTypeStyle[],
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            animation={google.maps.Animation.DROP}
          />
        </GoogleMap>

        {/* Map Overlay Hint */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md rounded-xl px-4 py-2.5 border border-outline-variant/10 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-on-surface-variant font-medium">
            Drag the pin to your exact shop entrance for accurate directions.
          </p>
        </div>
      </div>

      {/* Manual Coordinate Toggle */}
      <button
        type="button"
        onClick={() => setShowManualInputs(!showManualInputs)}
        className="text-xs font-bold text-primary hover:underline"
      >
        {showManualInputs ? '▾ Hide manual coordinates' : '▸ Enter coordinates manually'}
      </button>

      {showManualInputs && (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <div className="space-y-1">
            <label className="label-m3 text-xs">Latitude</label>
            <input
              type="number"
              step="any"
              className="input-m3"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="19.0760"
            />
          </div>
          <div className="space-y-1">
            <label className="label-m3 text-xs">Longitude</label>
            <input
              type="number"
              step="any"
              className="input-m3"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="72.8777"
            />
          </div>
          <button
            type="button"
            onClick={handleManualCoordinateApply}
            className="col-span-2 btn-tonal py-2 text-sm"
          >
            Apply Coordinates
          </button>
        </div>
      )}

      {/* Coordinate Summary */}
      {markerPosition.lat !== DEFAULT_CENTER.lat && (
        <div className="flex items-center gap-3 px-4 py-3 bg-tertiary-fixed/30 border border-tertiary/15 rounded-xl text-sm">
          <MapPin className="w-4 h-4 text-tertiary shrink-0" />
          <p className="text-on-surface font-medium">
            Selected: <span className="font-bold">{markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
