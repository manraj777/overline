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
  Camera,
  Calendar,
    Wallet,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button, Input, Card, Alert, Avatar, Loading } from '@/components/ui';
import { useUser, useUpdateProfile, useLogout, useMyBookings } from '@/hooks';
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

  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

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

  // Update form when user data changes
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

  // Redirect to login if not authenticated
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setAvatarUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'avatars');
      const { data } = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update user profile with new avatar URL
      await updateProfile.mutateAsync({ avatarUrl: data.url } as any);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
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
  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMM yyyy')
    : '—';

  const menuItems = [
    { icon: Calendar, label: 'My Bookings', href: '/bookings' },
    { icon: Bell, label: 'Notifications', href: '/profile/notifications' },
    { icon: Settings, label: 'Settings', href: '/profile/settings' },
      { icon: Wallet, label: 'Wallet', href: '/wallet' },
  ];

  return (
    <>
      <Head>
        <title>Profile - Overline</title>
      </Head>

      <div className="container-app py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card variant="bordered">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-900">
                  Personal Information
                </h2>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              {success && (
                <Alert variant="success" className="mb-4">
                  Profile updated successfully!
                </Alert>
              )}

              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              {/* Avatar Section */}
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                <div className="relative group">
                  <Avatar
                    src={user?.avatarUrl || null}
                    name={user?.name || ''}
                    size="xl"
                    className="!w-20 !h-20 text-2xl"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {avatarUploading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  {user?.phone && (
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {user.phone}
                    </p>
                  )}
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    label="Full Name"
                    leftIcon={<User className="w-5 h-5" />}
                    error={errors.name?.message}
                    {...register('name', {
                      required: 'Name is required',
                    })}
                  />

                  <Input
                    label="Email"
                    type="email"
                    leftIcon={<Mail className="w-5 h-5" />}
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />

                  {/* Phone — Read-only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={user?.phone || ''}
                        disabled
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed</p>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      {...register('dateOfBirth')}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      {...register('gender')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      isLoading={isSubmitting || updateProfile.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Name</p>
                      <p className="text-gray-900">{user?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Email</p>
                      <p className="text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Phone</p>
                      <p className="text-gray-900 flex items-center gap-1">
                        {user?.phone || '—'}
                        {user?.phone && <Lock className="w-3 h-3 text-gray-300" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Date of Birth</p>
                      <p className="text-gray-900">
                        {user?.dateOfBirth
                          ? format(new Date(user.dateOfBirth), 'dd MMM yyyy')
                          : '—'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium mb-1">Gender</p>
                      <p className="text-gray-900 capitalize">{user?.gender || '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Menu Items */}
            <Card variant="bordered" padding="none">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${index !== menuItems.length - 1
                    ? 'border-b border-gray-100'
                    : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-700">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </Card>

            {/* Logout */}
            <Card variant="bordered" padding="none">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <Card variant="bordered">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Bookings</span>
                  <span className="font-medium text-gray-900">{totalBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Member Since</span>
                  <span className="font-medium text-gray-900">{memberSince}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
