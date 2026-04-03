import { useEffect, useState } from 'react';
import Head from 'next/head';
import api from '@/lib/api';
import { Button, Card, Input, Loading, useToast } from '@/components/ui';
import { useStaffMe, useUpdateStaffMe } from '@/hooks';

export default function StaffProfilePage() {
  const { addToast } = useToast();
  const { data: me, isLoading, refetch } = useStaffMe();
  const updateMe = useUpdateStaffMe();

  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    avatar: '',
    notifReminderMins: 30,
    notifCallAheadMins: 15,
    notifNewBooking: true,
    notifLocationShare: true,
    notifReview: true,
  });

  useEffect(() => {
    if (!me) return;
    setForm({
      displayName: me.displayName || me.user?.name || '',
      bio: me.bio || '',
      avatar: me.avatar || '',
      notifReminderMins: Number(me.notificationSettings?.notifReminderMins || 30),
      notifCallAheadMins: Number(me.notificationSettings?.notifCallAheadMins || 15),
      notifNewBooking: me.notificationSettings?.notifNewBooking ?? true,
      notifLocationShare: me.notificationSettings?.notifLocationShare ?? true,
      notifReview: me.notificationSettings?.notifReview ?? true,
    });
  }, [me]);

  const saveProfile = async () => {
    try {
      await updateMe.mutateAsync({
        displayName: form.displayName,
        bio: form.bio,
        avatar: form.avatar || undefined,
      });
      addToast({ type: 'success', title: 'Profile updated' });
      refetch();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Update failed', message: error?.response?.data?.message || 'Try again.' });
    }
  };

  const saveNotificationPrefs = async () => {
    try {
      await updateMe.mutateAsync({
        notifReminderMins: form.notifReminderMins,
        notifCallAheadMins: form.notifCallAheadMins,
        notifNewBooking: form.notifNewBooking,
        notifLocationShare: form.notifLocationShare,
        notifReview: form.notifReview,
      });
      addToast({ type: 'success', title: 'Preferences updated' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Update failed', message: error?.response?.data?.message || 'Try again.' });
    }
  };

  const uploadAvatar = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'staff');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setForm((prev) => ({ ...prev, avatar: data.url }));
    addToast({ type: 'success', title: 'Avatar uploaded' });
  };

  if (isLoading) {
    return <Loading text="Loading profile..." />;
  }

  return (
    <>
      <Head>
        <title>Profile - Staff</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500">Manage your public profile and working preferences.</p>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Personal Info</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Display Name"
              value={form.displayName}
              onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
            />
            <Input label="Email" value={me?.user?.email || ''} disabled />
            <Input label="Phone" value={me?.user?.phone || ''} disabled />
            <Input
              label="Avatar URL"
              value={form.avatar}
              onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))}
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm">
              Upload Avatar
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                }}
              />
            </label>
            <Button onClick={saveProfile} isLoading={updateMe.isPending}>Save Profile</Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Notification Preferences</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Reminder to client (minutes)"
              type="number"
              min={0}
              max={180}
              value={form.notifReminderMins}
              onChange={(e) => setForm((prev) => ({ ...prev, notifReminderMins: Number(e.target.value) || 0 }))}
            />
            <Input
              label="Call-ahead (minutes)"
              type="number"
              min={0}
              max={180}
              value={form.notifCallAheadMins}
              onChange={(e) => setForm((prev) => ({ ...prev, notifCallAheadMins: Number(e.target.value) || 0 }))}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.notifNewBooking}
                onChange={(e) => setForm((prev) => ({ ...prev, notifNewBooking: e.target.checked }))}
              />
              New booking request
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.notifLocationShare}
                onChange={(e) => setForm((prev) => ({ ...prev, notifLocationShare: e.target.checked }))}
              />
              Client location shared
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.notifReview}
                onChange={(e) => setForm((prev) => ({ ...prev, notifReview: e.target.checked }))}
              />
              New review alert
            </label>
          </div>

          <div className="mt-4">
            <Button onClick={saveNotificationPrefs} isLoading={updateMe.isPending}>Save Notification Preferences</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
