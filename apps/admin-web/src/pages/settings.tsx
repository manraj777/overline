import React from 'react';
import Head from 'next/head';
import { Bell, Camera, Save, Store } from 'lucide-react';
import { Input, Loading, useToast, ImageUpload } from '@/components/ui';
import { useShopSettings, useUpdateShopSettings, useStaff } from '@/hooks';
import api from '@/lib/api';

type SettingsTab = 'shop' | 'media' | 'settings';

const SHOP_TYPES = ['Salon', 'Medical', 'Gym', 'Spa', 'Clinic', 'Other'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('shop');
  const { addToast } = useToast();

  const { data: shopData, isLoading } = useShopSettings();
  const { data: staffData } = useStaff();
  const updateSettings = useUpdateShopSettings();

  const [shopForm, setShopForm] = React.useState({
    name: '',
    shopType: 'Salon',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    location: '',
    latitude: '' as string | number,
    longitude: '' as string | number,
    googleMapLink: '',
    workingTime: '09:00 - 21:00',
  });

  const [notificationSettings, setNotificationSettings] = React.useState<Record<string, boolean>>({
    bookingConfirmation: true,
    bookingReminder: true,
    bookingCancellation: true,
    queueUpdates: false,
    newBooking: true,
    adminCancellation: true,
    dailySummary: false,
  });
  const [isResolvingLocation, setIsResolvingLocation] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string>('');

  React.useEffect(() => {
    if (!shopData) return;

    setShopForm({
      name: shopData.name || '',
      shopType: String(shopData.settings?.shopType || 'Salon'),
      phone: shopData.phone || '',
      email: shopData.email || '',
      address: shopData.address || '',
      city: shopData.city || '',
      state: shopData.state || '',
      postalCode: shopData.postalCode || '',
      location: String(shopData.settings?.location || shopData.address || ''),
      latitude: shopData.latitude || '',
      longitude: shopData.longitude || '',
      googleMapLink: String(shopData.settings?.googleMapLink || ''),
      workingTime: String(shopData.settings?.workingTime || '09:00 - 21:00'),
    });

    const savedNotifications = shopData.settings?.notifications || {};
    setNotificationSettings((prev) => ({ ...prev, ...savedNotifications }));
  }, [shopData]);

  const mapQuery = React.useMemo(() => {
    return [shopForm.location, shopForm.address, shopForm.city, shopForm.state, shopForm.postalCode]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(', ');
  }, [shopForm.location, shopForm.address, shopForm.city, shopForm.state, shopForm.postalCode]);

  const extractCoordinatesFromText = (text: string): { latitude: number; longitude: number } | null => {
    if (!text) return null;

    const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      return { latitude: Number(atMatch[1]), longitude: Number(atMatch[2]) };
    }

    const qMatch = text.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (qMatch) {
      return { latitude: Number(qMatch[1]), longitude: Number(qMatch[2]) };
    }

    return null;
  };

  const resolveMapCoordinates = async (): Promise<boolean> => {
    const fromLink = extractCoordinatesFromText(shopForm.googleMapLink);
    if (fromLink) {
      setShopForm((prev) => ({ ...prev, latitude: fromLink.latitude, longitude: fromLink.longitude }));
      return true;
    }

    if (!mapQuery) return false;

    try {
      setIsResolvingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(mapQuery)}`,
      );
      const data = await response.json();
      const top = Array.isArray(data) ? data[0] : null;

      if (!top?.lat || !top?.lon) return false;

      const latitude = Number(top.lat);
      const longitude = Number(top.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

      setShopForm((prev) => ({
        ...prev,
        latitude,
        longitude,
        location: prev.location || String(top.display_name || ''),
      }));
      return true;
    } catch {
      return false;
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const useCurrentLocation = () => {
    const applyIpFallback = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const latitude = Number(data?.latitude);
        const longitude = Number(data?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Could not infer coordinates from IP');
        }
        setShopForm((prev) => ({
          ...prev,
          latitude,
          longitude,
          city: prev.city || String(data?.city || ''),
          state: prev.state || String(data?.region || ''),
        }));
        setIsResolvingLocation(false);
        const message = 'Using approximate location from network. Adjust pin/address if needed.';
        setLocationError(message);
        addToast({ type: 'warning', title: 'Approximate location used', message });
      } catch {
        setIsResolvingLocation(false);
        const message = 'Unable to detect your location. Use Find from Address or enter coordinates manually.';
        setLocationError(message);
        addToast({ type: 'error', title: 'Location error', message });
      }
    };

    if (!navigator.geolocation) {
      addToast({ type: 'error', title: 'Error', message: 'Geolocation not supported by your browser' });
      setIsResolvingLocation(true);
      void applyIpFallback();
      return;
    }

    if (!window.isSecureContext) {
      const message = 'Current location works only on https or localhost. Use Find from Address or set coordinates manually.';
      setLocationError(message);
      setIsResolvingLocation(true);
      addToast({ type: 'warning', title: 'Location limited', message: 'Using approximate network location instead.' });
      void applyIpFallback();
      return;
    }

    setIsResolvingLocation(true);
    setLocationError('');

    const applyCoordinates = (latitude: number, longitude: number) => {
      setShopForm((prev) => ({
        ...prev,
        latitude,
        longitude,
      }));
      setIsResolvingLocation(false);
      addToast({ type: 'success', title: 'Location detected', message: 'Coordinates updated to your current position.' });
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Retry with relaxed accuracy because some devices block high-accuracy GPS.
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyCoordinates(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            const message = err.message || 'Unable to detect your location';
            setLocationError(message);
            void applyIpFallback();
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const saveShopDetails = async (event: React.FormEvent) => {
    event.preventDefault();

    const requiredTextFields: Array<{ key: keyof typeof shopForm; label: string }> = [
      { key: 'name', label: 'Name' },
      { key: 'shopType', label: 'Type' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'postalCode', label: 'Postal Code' },
      { key: 'location', label: 'Location' },
      { key: 'workingTime', label: 'Timing (Working Time)' },
    ];

    const missing = requiredTextFields.find(({ key }) => !String(shopForm[key] || '').trim());
    if (missing) {
      addToast({ type: 'error', title: `${missing.label} is required` });
      return;
    }

    const hasCoordinates = Number.isFinite(Number(shopForm.latitude)) && Number.isFinite(Number(shopForm.longitude));
    if (!hasCoordinates) {
      const resolved = await resolveMapCoordinates();
      if (!resolved) {
        addToast({
          type: 'error',
          title: 'Map location required',
          message: 'Set a valid map location so latitude and longitude can be detected automatically.',
        });
        return;
      }
    }

    try {
      await updateSettings.mutateAsync({
        name: shopForm.name,
        phone: shopForm.phone,
        email: shopForm.email,
        address: shopForm.address,
        city: shopForm.city,
        state: shopForm.state,
        postalCode: shopForm.postalCode,
        latitude: shopForm.latitude ? Number(shopForm.latitude) : undefined,
        longitude: shopForm.longitude ? Number(shopForm.longitude) : undefined,
        settings: {
          ...(shopData?.settings || {}),
          type: shopForm.shopType,
          shopType: shopForm.shopType,
          location: shopForm.location,
          googleLink: shopForm.googleMapLink,
          googleMapLink: shopForm.googleMapLink,
          timing: shopForm.workingTime,
          workingTime: shopForm.workingTime,
        },
      });
      addToast({ type: 'success', title: 'Shop details saved' });
    } catch (error: any) {
      const message = error?.response?.data?.message;
      addToast({ type: 'error', title: 'Failed to save', message: Array.isArray(message) ? message.join(', ') : message || 'Try again.' });
    }
  };

  const saveNotifications = async () => {
    try {
      await updateSettings.mutateAsync({
        settings: {
          ...(shopData?.settings || {}),
          notifications: notificationSettings,
        },
      });
      addToast({ type: 'success', title: 'Notification settings saved' });
    } catch (error: any) {
      const message = error?.response?.data?.message;
      addToast({ type: 'error', title: 'Failed to save', message: Array.isArray(message) ? message.join(', ') : message || 'Try again.' });
    }
  };

  const handleUploadCover = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'shops');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    await updateSettings.mutateAsync({ coverUrl: data.url });
    addToast({ type: 'success', title: 'Cover photo updated' });
    return data.url;
  };

  const handleUploadLogo = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'shops');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    await updateSettings.mutateAsync({ logoUrl: data.url });
    addToast({ type: 'success', title: 'Shop profile photo updated' });
    return data.url;
  };

  const handleUploadGalleryPhoto = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'shops');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const currentPhotos = shopData?.photoUrls || [];
    await updateSettings.mutateAsync({ photoUrls: [...currentPhotos, data.url] });
    addToast({ type: 'success', title: 'Photo added to gallery' });
    return data.url;
  };

  const removeGalleryPhoto = async (indexToRemove: number) => {
    try {
      const currentPhotos = shopData?.photoUrls || [];
      const updated = currentPhotos.filter((_: string, index: number) => index !== indexToRemove);
      await updateSettings.mutateAsync({ photoUrls: updated });
      addToast({ type: 'success', title: 'Photo removed' });
    } catch {
      addToast({ type: 'error', title: 'Failed to remove photo' });
    }
  };

  if (isLoading) {
    return <Loading text="Loading shop details..." />;
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'shop', label: 'Shop Details', icon: Store },
    { id: 'media', label: 'Shop Media', icon: Camera },
    { id: 'settings', label: 'Settings', icon: Bell },
  ];

  return (
    <>
      <Head>
        <title>Shop Details - Overline Admin</title>
      </Head>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <span className="label-m3 mb-2 block text-primary font-bold">● Live from Database</span>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">Shop Details</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage essential shop information and media.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64">
            <div className="card-m3 p-2">
              <nav className="space-y-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <tab.icon className="w-[18px] h-[18px]" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'shop' && (
              <div className="card-m3 p-8">
                <h2 className="text-lg font-bold text-on-surface mb-6">Shop Details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold text-outline tracking-widest uppercase">Total Staff</p>
                    <p className="mt-1 text-sm font-bold text-on-surface">{staffData?.length || 0}</p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold text-outline tracking-widest uppercase">Working Time</p>
                    <p className="mt-1 text-sm font-bold text-on-surface">{shopForm.workingTime}</p>
                  </div>
                </div>

                <form className="space-y-6" onSubmit={saveShopDetails}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      required
                      value={shopForm.name}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, name: e.target.value }))}
                    />

                    <div className="space-y-2">
                      <label className="label-m3">Type</label>
                      <select
                        className="input-m3"
                        required
                        value={shopForm.shopType}
                        onChange={(e) => setShopForm((prev) => ({ ...prev, shopType: e.target.value }))}
                      >
                        {SHOP_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Phone"
                      type="tel"
                      required
                      value={shopForm.phone}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, phone: e.target.value }))}
                      disabled
                    />
                    <Input
                      label="Email"
                      type="email"
                      required
                      value={shopForm.email}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, email: e.target.value }))}
                      disabled
                    />
                  </div>

                  <Input
                    label="Address"
                    required
                    value={shopForm.address}
                    onChange={(e) => setShopForm((prev) => ({ ...prev, address: e.target.value }))}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      required
                      value={shopForm.city}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                    <Input
                      label="State"
                      required
                      value={shopForm.state}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, state: e.target.value }))}
                    />
                    <Input
                      label="Postal Code"
                      required
                      value={shopForm.postalCode}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Location"
                      required
                      value={shopForm.location}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, location: e.target.value }))}
                      onBlur={() => {
                        if (!shopForm.latitude || !shopForm.longitude) {
                          void resolveMapCoordinates();
                        }
                      }}
                    />
                    <Input
                      label="Google Link (Optional)"
                      value={shopForm.googleMapLink}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, googleMapLink: e.target.value }))}
                    />
                  </div>

                  <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-outline uppercase tracking-wider">Map Coordinates (Auto)</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void resolveMapCoordinates()}
                          disabled={isResolvingLocation || !mapQuery}
                          className="btn-tonal px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Find from Address
                        </button>
                        <button
                          type="button"
                          onClick={useCurrentLocation}
                          disabled={isResolvingLocation}
                          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Use Current Location
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-surface px-3 py-2 border border-outline-variant/10">
                        <span className="text-outline mr-2">Latitude:</span>
                        <span className="font-semibold text-on-surface">{shopForm.latitude || 'Not detected'}</span>
                      </div>
                      <div className="rounded-lg bg-surface px-3 py-2 border border-outline-variant/10">
                        <span className="text-outline mr-2">Longitude:</span>
                        <span className="font-semibold text-on-surface">{shopForm.longitude || 'Not detected'}</span>
                      </div>
                    </div>
                    {locationError && <p className="text-xs text-error font-medium">{locationError}</p>}
                    {shopForm.latitude && shopForm.longitude && (
                      <iframe
                        title="Shop location map"
                        className="w-full h-64 rounded-xl border border-outline-variant/15"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(shopForm.longitude) - 0.01}%2C${Number(shopForm.latitude) - 0.01}%2C${Number(shopForm.longitude) + 0.01}%2C${Number(shopForm.latitude) + 0.01}&layer=mapnik&marker=${Number(shopForm.latitude)}%2C${Number(shopForm.longitude)}`}
                      />
                    )}
                  </div>

                  <Input
                    label="Timing (Working Time)"
                    required
                    value={shopForm.workingTime}
                    onChange={(e) => setShopForm((prev) => ({ ...prev, workingTime: e.target.value }))}
                    placeholder="09:00 - 21:00"
                  />

                  <button type="submit" disabled={updateSettings.isPending} className="btn-primary px-8 py-3 disabled:opacity-50 mt-6">
                    <Save className="w-4 h-4" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Shop Details'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-6">
                <div className="card-m3 p-8">
                  <h2 className="text-sm font-bold text-on-surface mb-2">Cover Photo</h2>
                  <p className="text-xs text-on-surface-variant mb-4">Main image for your shop page.</p>
                  <ImageUpload
                    currentUrl={shopData?.coverUrl}
                    onUpload={handleUploadCover}
                    label="Upload Cover Photo"
                    hint="Recommended: 1200x400, JPG or PNG"
                    size="lg"
                  />
                </div>

                <div className="card-m3 p-8">
                  <h2 className="text-sm font-bold text-on-surface mb-2">Shop Profile Photo</h2>
                  <p className="text-xs text-on-surface-variant mb-4">Logo/profile image of your shop.</p>
                  <ImageUpload
                    currentUrl={shopData?.logoUrl}
                    onUpload={handleUploadLogo}
                    label="Upload Shop Profile Photo"
                    hint="Recommended: 200x200, JPG or PNG"
                    size="md"
                    shape="circle"
                  />
                </div>

                <div className="card-m3 p-8">
                  <h2 className="text-sm font-bold text-on-surface mb-2">Gallery</h2>
                  <p className="text-xs text-on-surface-variant mb-4">Add and manage additional shop photos.</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    {shopData?.photoUrls?.map((url: string, index: number) => (
                      <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
                        <img src={url} alt={`Shop photo ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeGalleryPhoto(index)}
                          className="absolute top-2 right-2 p-1.5 bg-error text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="Remove photo"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>

                  <ImageUpload
                    currentUrl={null}
                    onUpload={handleUploadGalleryPhoto}
                    label="Add Gallery Photo"
                    hint="JPG, PNG, WebP up to 5MB"
                    size="sm"
                  />
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="card-m3 p-8">
                <h2 className="text-lg font-bold text-on-surface mb-6">Settings</h2>
                <p className="text-sm text-on-surface-variant mb-6">Notifications and preferences.</p>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface mb-3">Customer Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Booking confirmation', key: 'bookingConfirmation' },
                        { label: 'Booking reminder (1 hour before)', key: 'bookingReminder' },
                        { label: 'Booking cancellation', key: 'bookingCancellation' },
                        { label: 'Queue updates', key: 'queueUpdates' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between py-2">
                          <span className="text-sm text-on-surface-variant font-medium">{item.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-primary rounded"
                            checked={notificationSettings[item.key] ?? false}
                            onChange={(e) => setNotificationSettings((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-on-surface mb-3">Admin Notifications</h3>
                    <div className="space-y-1">
                      {[
                        { label: 'New booking', key: 'newBooking' },
                        { label: 'Booking cancellation', key: 'adminCancellation' },
                        { label: 'Daily summary', key: 'dailySummary' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between py-2">
                          <span className="text-sm text-on-surface-variant font-medium">{item.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-primary rounded"
                            checked={notificationSettings[item.key] ?? false}
                            onChange={(e) => setNotificationSettings((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button onClick={saveNotifications} disabled={updateSettings.isPending} className="btn-primary px-8 py-3 disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
