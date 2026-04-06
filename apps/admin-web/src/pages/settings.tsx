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
      location: String(shopData.settings?.location || ''),
      googleMapLink: String(shopData.settings?.googleMapLink || ''),
      workingTime: String(shopData.settings?.workingTime || '09:00 - 21:00'),
    });

    const savedNotifications = shopData.settings?.notifications || {};
    setNotificationSettings((prev) => ({ ...prev, ...savedNotifications }));
  }, [shopData]);

  const saveShopDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateSettings.mutateAsync({
        name: shopForm.name,
        phone: shopForm.phone,
        email: shopForm.email,
        address: shopForm.address,
        city: shopForm.city,
        state: shopForm.state,
        postalCode: shopForm.postalCode,
        settings: {
          ...(shopData?.settings || {}),
          shopType: shopForm.shopType,
          location: shopForm.location,
          googleMapLink: shopForm.googleMapLink,
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

      <div>
        <div className="mb-8">
          <span className="label-m3 mb-2 block">Shop Details</span>
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
                      value={shopForm.name}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, name: e.target.value }))}
                    />

                    <div className="space-y-2">
                      <label className="label-m3">Type</label>
                      <select
                        className="input-m3"
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
                      value={shopForm.phone}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={shopForm.email}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <Input
                    label="Address"
                    value={shopForm.address}
                    onChange={(e) => setShopForm((prev) => ({ ...prev, address: e.target.value }))}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      value={shopForm.city}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                    <Input
                      label="State"
                      value={shopForm.state}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, state: e.target.value }))}
                    />
                    <Input
                      label="Postal Code"
                      value={shopForm.postalCode}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Location"
                      value={shopForm.location}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, location: e.target.value }))}
                    />
                    <Input
                      label="Google Link (Optional)"
                      value={shopForm.googleMapLink}
                      onChange={(e) => setShopForm((prev) => ({ ...prev, googleMapLink: e.target.value }))}
                    />
                  </div>

                  <Input
                    label="Timing (Working Time)"
                    value={shopForm.workingTime}
                    onChange={(e) => setShopForm((prev) => ({ ...prev, workingTime: e.target.value }))}
                    placeholder="09:00 - 21:00"
                  />

                  <button type="submit" disabled={updateSettings.isPending} className="btn-primary px-8 py-3 disabled:opacity-50">
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
                <p className="text-sm text-on-surface-variant mb-6">Notifications moved here as requested.</p>

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
