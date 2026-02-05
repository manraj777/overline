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
} from 'lucide-react';
import { Button, Input, Card, Alert, Avatar, Loading } from '@/components/ui';
import { useUser, useUpdateProfile, useLogout } from '@/hooks';
import { useAuthStore } from '@/stores/auth';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { isLoading: userLoading } = useUser();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();

  const [isEditing, setIsEditing] = React.useState(false);
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
      phone: user?.phone || '',
    },
  });

  // Update form when user data changes
  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      });
    }
  }, [user, reset]);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile');
    }
  }, [isAuthenticated, authLoading, router]);

  const onSubmit = async (data: ProfileForm) => {
    setError(null);
    setSuccess(false);

    try {
      await updateProfile.mutateAsync(data);
      setSuccess(true);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/');
  };

  if (authLoading || userLoading || !isAuthenticated) {
    return <Loading text="Loading profile..." />;
  }

  const menuItems = [
    {
      icon: Bell,
      label: 'Notifications',
      href: '/profile/notifications',
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/profile/settings',
    },
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
                    Edit
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

                  <Input
                    label="Phone"
                    type="tel"
                    leftIcon={<Phone className="w-5 h-5" />}
                    error={errors.phone?.message}
                    {...register('phone')}
                  />

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
                  <div className="flex items-center gap-4">
                    <Avatar src={null} name={user?.name || ''} size="xl" />
                    <div>
                      <h3 className="font-medium text-gray-900">{user?.name}</h3>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span>{user?.email}</span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span>{user.phone}</span>
                      </div>
                    )}
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
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                    index !== menuItems.length - 1
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
                  <span className="font-medium text-gray-900">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Member Since</span>
                  <span className="font-medium text-gray-900">Jan 2024</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
