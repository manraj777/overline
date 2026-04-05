import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import {
  User,
  Mail,
  Phone,
  Bell,
  LogOut,
  ChevronRight,
  Settings,
  Calendar,
  Wallet,
  Lock,
  Star,
  Edit3,
} from 'lucide-react';
import { Button, Input, Card, Alert, Loading, ImageUpload } from '@/components/ui';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { useUser, useUpdateProfile, useLogout, useMyBookings, useTrendingShops, useWallet, useMyReviews } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { format } from 'date-fns';

interface ProfileForm {
  name: string;
  email: string;
  dateOfBirth: string;
  gender: string;
}

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { isLoading: userLoading } = useUser();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();
  const { data: bookingsData } = useMyBookings();
  const { data: trendingShops } = useTrendingShops(5);
  const { data: wallet } = useWallet();
  const { data: myReviews } = useMyReviews();

  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      dateOfBirth: user?.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : '',
      gender: user?.gender || '',
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : '',
        gender: user.gender || '',
      });
    }
  }, [user, reset]);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated && !isLoggingOut) {
      router.push('/auth/login?redirect=/profile');
    }
  }, [isAuthenticated, authLoading, router, isLoggingOut]);

  const onSubmit = async (data: ProfileForm) => {
    setError(null);
    setSuccess(false);
    try {
      await updateProfile.mutateAsync({
        name: data.name,
        email: data.email,
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
      } as any);
      setSuccess(true);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAvatarUpload = async (file: File): Promise<string> => {
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'avatars');
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await updateProfile.mutateAsync({ avatarUrl: data.url } as any);
    setSuccess(true);
    return data.url;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout.mutateAsync();
    router.push('/');
  };

  if (authLoading || userLoading || !isAuthenticated) {
    return <Loading text="Loading profile..." />;
  }

  const totalBookings = bookingsData?.meta?.total || 0;
  const totalReviews = Array.isArray(myReviews?.data)
    ? myReviews.data.length
    : Array.isArray(myReviews)
      ? myReviews.length
      : 0;
  const earnedPoints = Math.max(0, Math.round(Number(wallet?.totalEarned || 0)));
  const nextTierTarget = 1000;
  const pointsToNextTier = Math.max(0, nextTierTarget - earnedPoints);
  const progressToNextTier = Math.min(100, Math.round((earnedPoints / nextTierTarget) * 100));
  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMM yyyy')
    : '—';
  const safeTrendingShops = Array.isArray(trendingShops) ? trendingShops : [];

  const menuItems = [
    { icon: Calendar, label: 'My Bookings', href: '/bookings', badge: totalBookings > 0 ? String(totalBookings) : undefined },
    { icon: Bell, label: 'Notifications', href: '/profile/notifications' },
    { icon: Settings, label: 'Settings', href: '/profile/settings' },
    { icon: Wallet, label: 'Wallet', href: '/wallet' },
  ];

  return (
    <>
      <Head>
        <title>Profile — Overline</title>
        <meta name="description" content="Manage your Overline profile, bookings and preferences." />
      </Head>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header Card */}
            <div className="card-m3 overflow-hidden">
              {/* Cover Gradient */}
              <div className="h-32 bg-gradient-to-br from-primary to-secondary relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
              </div>

              <div className="px-8 pb-8 -mt-12">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div className="flex items-end gap-5">
                    <div className="relative">
                      <ImageUpload
                        currentUrl={user?.avatarUrl || null}
                        onUpload={handleAvatarUpload}
                        label="Upload Photo"
                        hint="JPG, PNG, WebP, GIF up to 5MB"
                        shape="circle"
                        size="lg"
                      />
                    </div>
                    <div className="pb-1">
                      <h1 className="text-2xl font-black tracking-tight text-on-surface">{user?.name}</h1>
                      <p className="text-sm text-on-surface-variant font-medium">{user?.email}</p>
                      {user?.phone && (
                        <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-tonal px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Bookings', value: String(totalBookings), color: 'text-primary' },
                { label: 'Member Since', value: memberSince, color: 'text-secondary' },
                { label: 'Points', value: String(earnedPoints), color: 'text-tertiary' },
                { label: 'Reviews', value: String(totalReviews), color: 'text-on-surface' },
              ].map((stat) => (
                <div key={stat.label} className="card-m3-flat p-5 text-center">
                  <div className={`text-2xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-[11px] font-bold tracking-widest uppercase text-outline">{stat.label}</div>
                </div>
              ))}
            </div>

            <Alert variant="info" className="mb-0">
              Points are calculated from wallet earnings and rewards. They represent your accumulated value on Overline.
            </Alert>

            {/* Alerts */}
            {success && (
              <Alert variant="success" className="mb-0">
                Profile updated successfully!
              </Alert>
            )}
            {error && (
              <Alert variant="error" className="mb-0">
                {error}
              </Alert>
            )}

            {/* Personal Information Card */}
            <div className="card-m3 p-8">
              <h2 className="text-sm font-bold tracking-widest text-outline uppercase mb-6">
                Personal Information
              </h2>

              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <label className="label-m3">Full Name</label>
                    <input
                      type="text"
                      className="input-m3"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <p className="text-error text-xs font-medium">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="label-m3">Email</label>
                    <input
                      type="email"
                      className="input-m3"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email',
                        },
                      })}
                    />
                    {errors.email && <p className="text-error text-xs font-medium">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="label-m3">Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={user?.phone || ''}
                        disabled
                        className="input-m3 text-outline cursor-not-allowed opacity-60"
                      />
                      <Lock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                    </div>
                    <p className="text-[11px] text-outline px-1">Phone number cannot be changed</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label-m3">Date of Birth</label>
                      <input
                        type="date"
                        {...register('dateOfBirth')}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        className="input-m3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-m3">Gender</label>
                      <select {...register('gender')} className="input-m3">
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      isLoading={isSubmitting || updateProfile.isPending}
                      className="btn-primary px-8 py-3"
                    >
                      Save Changes
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); reset(); }}
                      className="btn-tonal px-6 py-3"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: 'Name', value: user?.name },
                    { label: 'Email', value: user?.email },
                    { label: 'Phone', value: user?.phone || '—', locked: !!user?.phone },
                    { label: 'Date of Birth', value: user?.dateOfBirth ? format(new Date(user.dateOfBirth), 'dd MMM yyyy') : '—' },
                    { label: 'Gender', value: user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—' },
                    { label: 'Member Since', value: memberSince },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="label-m3 mb-1">{item.label}</p>
                      <p className="text-on-surface font-medium flex items-center gap-1">
                        {item.value}
                        {(item as any).locked && <Lock className="w-3 h-3 text-outline-variant" />}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="card-m3 overflow-hidden">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors active:scale-[0.99] ${
                    index !== menuItems.length - 1 ? 'border-b border-outline-variant/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold text-on-surface">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="bg-primary-fixed text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-outline-variant" />
                  </div>
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl text-error border border-error/15 hover:bg-error-container/20 transition-colors font-semibold"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:block space-y-6">
            {/* Loyalty Status */}
            <div className="card-m3 p-8">
              <div className="flex justify-between items-center mb-6">
                <span className="label-m3">Loyalty Status</span>
                <span className="text-secondary font-black tracking-tight text-lg">Member</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-black text-on-surface leading-none">
                    {earnedPoints} <span className="text-base font-medium text-outline">pts</span>
                  </span>
                  <span className="text-sm font-bold text-tertiary">{pointsToNextTier} to next tier</span>
                </div>
                <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-primary-container rounded-full" style={{ width: `${progressToNextTier}%` }} />
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Points are synced from your wallet earnings and update automatically after bookings.
                </p>
              </div>
            </div>

            {/* Trending Shops */}
            <div className="card-m3 p-8">
              <h3 className="font-bold text-on-surface mb-5 flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-secondary" />
                Trending Shops
              </h3>
              {!trendingShops ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-shimmer rounded-xl">
                      <div className="w-12 h-12 bg-surface-container-high rounded-xl shrink-0" />
                      <div className="flex-1 py-1">
                        <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2" />
                        <div className="h-3 bg-surface-container-high rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : safeTrendingShops.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">No trending shops currently.</p>
              ) : (
                <div className="space-y-2">
                  {safeTrendingShops.slice(0, 3).map((shop) => (
                    <div
                      key={shop.id}
                      onClick={() => router.push(`/shops/${shop.slug}`)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors active:scale-[0.98]"
                    >
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={shop.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-outline-variant/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                          <span className="text-outline text-sm font-bold">
                            {(shop.name || 'NA').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-on-surface truncate">{shop.name}</h4>
                        <p className="text-xs text-on-surface-variant truncate">{shop.city || 'Location unavailable'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push('/explore')}
                className="w-full mt-4 btn-tonal py-2.5 text-sm"
              >
                Explore More
              </button>
            </div>
          </div>
        </div>
      </div>
      <ReviewModal />
    </>
  );
}
