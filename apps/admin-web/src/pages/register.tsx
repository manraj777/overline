import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Button, Input, Card } from '@/components/ui';
import { useRegisterShop } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { Check, User, Store, MapPin } from 'lucide-react';
import type { TenantType } from '@/types';

interface RegisterForm {
  ownerName: string;
  email: string;
  password: string;
  shopName: string;
  shopType: 'SALON' | 'CLINIC' | 'BARBER' | 'SPA' | 'OTHER';
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

const STEP_INFO = [
  { label: 'Owner', icon: User },
  { label: 'Shop', icon: Store },
  { label: 'Location', icon: MapPin },
];

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const registerShop = useRegisterShop();

  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ defaultValues: { shopType: 'SALON' } });

  React.useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const onNextStep = async () => {
    let isValid = false;
    if (step === 1) isValid = await trigger(['ownerName', 'email', 'password']);
    else if (step === 2) isValid = await trigger(['shopName', 'shopType', 'phone']);
    if (isValid) setStep((prev) => prev + 1);
  };

  const onPrevStep = () => setStep((prev) => prev - 1);

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      await registerShop.mutateAsync(data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <>
      <Head>
        <title>Register Shop — Overline Admin</title>
        <meta name="description" content="Create your shop on Overline and start managing bookings." />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden p-4">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-secondary/10 to-transparent rounded-full blur-[100px] translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-[120px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="w-full max-w-lg relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-button">
              <span className="text-white font-black text-2xl">O</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Create your Shop</h1>
            <p className="text-on-surface-variant text-sm mt-1.5">Join Overline and manage your bookings</p>
          </div>

          <div className="card-m3 p-8">
            {/* Stepper */}
            <div className="flex items-center justify-center mb-8">
              {STEP_INFO.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                        step > i + 1
                          ? 'bg-tertiary text-white'
                          : step >= i + 1
                            ? 'bg-primary text-white shadow-button'
                            : 'bg-surface-container-high text-outline'
                      }`}
                    >
                      {step > i + 1 ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[9px] font-bold tracking-widest uppercase ${step >= i + 1 ? 'text-primary' : 'text-outline'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`w-12 h-0.5 rounded-full mx-2 mb-5 transition-colors ${step > i + 1 ? 'bg-tertiary' : 'bg-surface-container-high'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error-container/50 border border-error/20 rounded-xl text-error text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="label-m3 pb-3 border-b border-outline-variant/10">Owner Details</h2>
                  <div className="space-y-2">
                    <label className="label-m3">Full Name</label>
                    <input className="input-m3" placeholder="John Doe" {...register('ownerName', { required: 'Name is required' })} />
                    {errors.ownerName && <p className="text-error text-xs font-medium">{errors.ownerName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="label-m3">Email Address</label>
                    <input className="input-m3" type="email" placeholder="john@example.com" {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })} />
                    {errors.email && <p className="text-error text-xs font-medium">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="label-m3">Password</label>
                    <input className="input-m3" type="password" placeholder="••••••••" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
                    {errors.password && <p className="text-error text-xs font-medium">{errors.password.message}</p>}
                  </div>
                  <button type="button" className="w-full btn-primary py-3.5 mt-6" onClick={onNextStep}>
                    Next: Shop Details
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="label-m3 pb-3 border-b border-outline-variant/10">Shop Details</h2>
                  <div className="space-y-2">
                    <label className="label-m3">Shop Name</label>
                    <input className="input-m3" placeholder="My Awesome Salon" {...register('shopName', { required: 'Shop Name is required' })} />
                    {errors.shopName && <p className="text-error text-xs font-medium">{errors.shopName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="label-m3">Shop Type</label>
                    <select className="input-m3" {...register('shopType', { required: 'Selecting a type is required' })}>
                      <option value="SALON">Salon</option>
                      <option value="CLINIC">Clinic</option>
                      <option value="BARBER">Barber</option>
                      <option value="SPA">Spa</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-m3">Business Phone</label>
                    <input className="input-m3" placeholder="+91 9876543210" {...register('phone', { required: 'Phone is required' })} />
                    {errors.phone && <p className="text-error text-xs font-medium">{errors.phone.message}</p>}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button type="button" className="flex-1 btn-tonal py-3" onClick={onPrevStep}>Back</button>
                    <button type="button" className="flex-1 btn-primary py-3" onClick={onNextStep}>Next: Location</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="label-m3 pb-3 border-b border-outline-variant/10">Location Details</h2>
                  <div className="space-y-2">
                    <label className="label-m3">Street Address</label>
                    <input className="input-m3" placeholder="123 Main St" {...register('address', { required: 'Address is required' })} />
                    {errors.address && <p className="text-error text-xs font-medium">{errors.address.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label-m3">City</label>
                      <input className="input-m3" placeholder="Mumbai" {...register('city', { required: 'City is required' })} />
                      {errors.city && <p className="text-error text-xs font-medium">{errors.city.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="label-m3">State</label>
                      <input className="input-m3" placeholder="MH (Optional)" {...register('state')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="label-m3">Postal Code</label>
                    <input className="input-m3" placeholder="400001 (Optional)" {...register('postalCode')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label-m3">Latitude</label>
                      <input className="input-m3" type="number" step="any" placeholder="19.0760" {...register('latitude', { required: 'Latitude is required', valueAsNumber: true })} />
                      {errors.latitude && <p className="text-error text-xs font-medium">{errors.latitude.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="label-m3">Longitude</label>
                      <input className="input-m3" type="number" step="any" placeholder="72.8777" {...register('longitude', { required: 'Longitude is required', valueAsNumber: true })} />
                      {errors.longitude && <p className="text-error text-xs font-medium">{errors.longitude.message}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button type="button" className="flex-1 btn-tonal py-3" disabled={isSubmitting || registerShop.isPending} onClick={onPrevStep}>Back</button>
                    <Button type="submit" className="flex-1 btn-primary py-3" isLoading={isSubmitting || registerShop.isPending}>
                      Finish Registration
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <p className="text-center text-xs text-outline mt-6 pt-4 border-t border-outline-variant/10">
              Already have a shop account?{' '}
              <span onClick={() => router.push('/login')} className="text-primary font-semibold hover:underline cursor-pointer">
                Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
