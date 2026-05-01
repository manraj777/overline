import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import { useSignup } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { buildAuthUrl } from '@/lib/backend-url';

interface SignupForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { redirect } = router.query;
  const { isAuthenticated } = useAuthStore();
  const signup = useSignup();

  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>();

  const password = watch('password');

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push((redirect as string) || '/');
    }
  }, [isAuthenticated, redirect, router]);

  const onSubmit = async (data: SignupForm) => {
    setError(null);
    try {
      const res = await signup.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });

      if (!res.user.isPhoneVerified) {
        router.push('/auth/verify-phone');
      } else {
        router.push((redirect as string) || '/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Create Account — Overline</title>
        <meta name="description" content="Join Overline to discover and book premium services near you." />
      </Head>

      <div className="min-h-screen flex overflow-hidden bg-surface">
        {/* ── Left: Visual Hero ── */}
        <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-secondary">
          <div className="absolute inset-0 z-0">
            <img
              alt="Premium spa interior"
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80"
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary/90 via-secondary/40 to-transparent" />
          </div>
          <div className="relative z-10 flex flex-col justify-between p-16 w-full">
            <div className="flex items-center gap-3">
              <img src="/overline-logo.png" alt="Overline" className="h-10 w-auto object-contain brightness-0 invert" />
            </div>
            <div className="max-w-md">
              <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Your time deserves better.
              </h1>
              <p className="text-white/80 text-lg leading-relaxed">
                Create your account and join thousands of professionals who trust our Digital Concierge for seamless booking experiences.
              </p>
              <div className="mt-10 flex gap-6">
                <div>
                  <div className="text-3xl font-black text-white">10k+</div>
                  <div className="text-sm text-white/50 font-medium">Active Users</div>
                </div>
                <div className="w-px bg-white/20" />
                <div>
                  <div className="text-3xl font-black text-white">500+</div>
                  <div className="text-sm text-white/50 font-medium">Partner Shops</div>
                </div>
                <div className="w-px bg-white/20" />
                <div>
                  <div className="text-3xl font-black text-white">4.9</div>
                  <div className="text-sm text-white/50 font-medium">App Rating</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <span className="w-12 h-[1px] bg-white/30" />
              <span className="tracking-[0.2em] uppercase font-medium">Trusted Platform</span>
            </div>
          </div>
        </section>

        {/* ── Right: Sign Up Form ── */}
        <section className="w-full lg:w-1/2 flex flex-col bg-surface relative">
          {/* Mobile Logo */}
          <div className="lg:hidden p-8">
            <Link href="/" className="flex items-center gap-3">
              <img src="/overline-logo.png" alt="Overline" className="h-8 w-auto object-contain dark:invert" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center px-8 lg:px-24 py-8">
            <div className="w-full max-w-[440px]">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                  Create account
                </h2>
                <p className="text-on-surface-variant font-medium">
                  Join Overline to book appointments easily.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="error" className="mb-6">
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="label-m3">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    className="input-m3"
                    {...register('name', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                    })}
                  />
                  {errors.name && <p className="text-error text-xs font-medium">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="label-m3">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="input-m3"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.email && <p className="text-error text-xs font-medium">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="label-m3">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 9876543210"
                    className="input-m3"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^(\+91|91)?[6-9]\d{9}$/,
                        message: 'Enter a valid Indian mobile number',
                      },
                    })}
                  />
                  {errors.phone && <p className="text-error text-xs font-medium">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="label-m3">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="input-m3 pr-12"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-error text-xs font-medium">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="label-m3">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="input-m3"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match',
                    })}
                  />
                  {errors.confirmPassword && <p className="text-error text-xs font-medium">{errors.confirmPassword.message}</p>}
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    isLoading={isSubmitting || signup.isPending}
                    className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-button hover:shadow-button-hover active:scale-[0.97] transition-all"
                  >
                    Create Account
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full h-[1px] bg-outline-variant/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                  <span className="bg-surface px-4 text-outline">Or sign up with</span>
                </div>
              </div>

              {/* Google Sign-Up */}
              <a
                href={buildAuthUrl('/auth/google', { from: 'user' })}
                className="w-full h-14 flex items-center justify-center gap-3 rounded-[4px] bg-white border border-[#dadce0] font-medium text-[#3c4043] hover:bg-[#f8f9fa] transition-colors active:scale-[0.97] duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </a>
              <p className="mt-2 text-center text-[11px] text-on-surface-variant/70 leading-relaxed max-w-sm mx-auto">
                Overline uses your Google name and email address to create your account, sign you in securely, and send booking confirmations.
              </p>

              {/* Terms + Login link */}
              <p className="text-center text-on-surface-variant text-xs mt-6 leading-relaxed">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-primary font-semibold hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
              </p>

              <p className="mt-8 text-center text-sm font-medium text-on-surface-variant">
                Already have an account?{' '}
                <Link
                  href={`/auth/login${redirect ? `?redirect=${redirect}` : ''}`}
                  className="text-primary font-bold hover:underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full py-8 px-12 flex flex-col items-center gap-4 text-[11px] font-bold tracking-widest uppercase text-outline">
            <div className="flex gap-8">
              <a className="hover:text-primary transition-colors" href="#">Privacy</a>
              <a className="hover:text-primary transition-colors" href="#">Terms</a>
              <a className="hover:text-primary transition-colors" href="#">Support</a>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>© {new Date().getFullYear()} Overline. Built for clarity.</span>
              <span className="normal-case text-[10px] text-outline-variant font-medium">Google is a trademark of Google LLC.</span>
            </div>
          </footer>
        </section>
      </div>
    </>
  );
}
